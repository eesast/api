import bcrypt from "bcrypt";
import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import * as HnrHasFunc from "../hasura/honor";
import {
  get_current_semester,
  set_current_semester,
  get_semester_list,
  add_semester,
  delete_semester,
} from "../hasura/mentor";
import authenticate from "../middlewares/authenticate";
import { sendEmail } from "../helpers/email";
import {
  newMentorApplicationTemplate,
  updateMentorApplicationTemplate,
  newMentorApplicationTalkTemplate,
  updateMentorApplicationTalkTemplate,
  newMentorApplicationMemberTalkTemplate,
  updateMentorApplicationMemberTalkTemplate,
} from "../helpers/htmlTemplates";
import * as validator from "../helpers/validate";

const router = express.Router();

interface IMentor {
  uuid: string; // 导师uuid
  name: string; // 导师姓名
  dept: string; // 导师院系
  mail: string; // 导师邮箱
  phon?: string; // 导师电话
  intr?: string; // 导师简介
  bgnd?: string; // 导师背景
  flds?: string; // 导师领域
  achv?: string; // 导师成就
  avail?: boolean; // 导师是否可用
  is_mem?: boolean; // 导师是否参与积极分子谈话
  dig_type?: string; // 导师谈话类型
  max_apl?: number; // 导师最大申请人数
  tot_apl?: number; // 导师总申请人数
  mat_apl?: number; // 导师已匹配人数
}

interface IStudent {
  uuid: string; // 学生uuid
  name: string; // 学生姓名
  stid: string; // 学生学号
  dept: string; // 学生院系
  clss: string; // 学生班级
  mail: string; // 学生邮箱
  phon: string; // 学生电话
}

interface IApplication {
  id: string; // 申请id
  stmt: string; // 申请陈述
  created: string; // 申请时间
  year: number; // 申请年份
  status: string; // 申请状态
  is_mem: boolean; // 是否参与积极分子谈话
  chat: boolean; // 申请聊天状态，由学生发起
  chat2: boolean; // 申请聊天状态，由导师确认
  chat_t?: string; // 申请聊天时间
  mem_chat: boolean; // 积极分子谈话状态，由学生发起
  mem_chat2: boolean; // 积极分子谈话状态，由导师确认
  mem_chat_t?: string; // 积极分子谈话时间
  men?: IMentor; // 申请导师
  stu?: IStudent; // 申请学生
}

interface IFreshman {
  name: string; // 学生姓名
  stid: string; // 学生学号
  is_mem: boolean; // 是否参与积极分子谈话
  uuid?: string; // 学生uuid
}

interface ISchedulePeriod {
  beg: Date; // 开始时间
  end: Date; // 结束时间
  roles?: string[]; // 参与角色（显示用）
  prompt?: string; // 提示信息（显示用）
}
interface ISchedule {
  A: ISchedulePeriod; // 预备阶段：导师更新个人信息
  B: ISchedulePeriod; // 预备阶段：学生了解导师信息
  C: ISchedulePeriod; // 第一阶段：自由申请与匹配
  D: ISchedulePeriod; // 第二阶段：未匹配同学补选
  E: ISchedulePeriod; // 第三阶段：系统随机分配
}

/* 查询荣誉类别和当年的荣誉申请时间段
 * @return {types: [type_name], time: {start_A, end_A, start_B, end_B}}
 */
router.get("/info/honor", async (req, res) => {
  try {
    const year = new Date().getFullYear();
    //在hasura中查询activateIn为year的时间信息
    const q_honor_time: any = await client.request(
      gql`
        query MyQuery($activateIn: Int!) {
          honor_time_by_pk(activateIn: $activateIn) {
            start_A
            end_A
            start_B
            end_B
          }
        }
      `,
      { activateIn: year },
    );
    if (!q_honor_time?.honor_time_by_pk) {
      return res.status(500).send("Error: No honor time found");
    }
    const q_honor_type: any = await client.request(gql`
      query MyQuery {
        honor_type {
          type_name
        }
      }
    `);
    const types: string[] = q_honor_type.honor_type.map(
      (item: { type_name: string }) => item.type_name,
    );
    return res
      .status(200)
      .send({ types: types, time: q_honor_time.honor_time_by_pk });
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.post("/honor/insert_one", async (req, res) => {
  try {
    const student_uuid: string = req.body.student_uuid;
    const honor: string = req.body.honor;
    const statement: string = req.body.statement ?? "";
    const attachment_url: string = req.body.attachment_url ?? undefined;

    if (!student_uuid || !honor) {
      return res.status(450).send("Error: Missing student_uuid or honor");
    }

    const role = await HnrHasFunc.query_user_role(student_uuid);
    if (role !== "student" && role !== "counselor") {
      return res.status(451).send("Error: Invalid role");
    }

    const year: number = new Date().getFullYear();
    const insert_id = await HnrHasFunc.insert_honor_application(
      student_uuid,
      honor,
      statement,
      attachment_url,
      year,
    );
    if (!insert_id) {
      return res.status(452).send("Error: Insert honor application failed");
    }
    return res.status(200).send(insert_id);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

router.post("/honor/update_one", async (req, res) => {
  try {
    const id: string = req.body.id;
    const honor: string = req.body.honor;
    const statement: string = req.body.statement ?? "";
    const attachment_url: string = req.body.attachment_url ?? undefined;
    const student_uuid: string = req.body.student_uuid;

    if (!id || !honor || !student_uuid) {
      return res.status(450).send("Error: Missing id or honor or student_uuid");
    }

    const application = await HnrHasFunc.query_honor_application(id);
    const role = await HnrHasFunc.query_user_role(student_uuid);
    if (!application) {
      return res.status(451).send("Error: No honor application found");
    } else if (
      application.student_uuid !== student_uuid &&
      role !== "counselor"
    ) {
      return res.status(452).send("Error: Invalid student_uuid");
    }

    const year: number = new Date().getFullYear();
    if (application.year !== year) {
      return res.status(453).send("Error: Invalid year");
    }

    if (!attachment_url) {
      const response = await HnrHasFunc.update_honor_application(
        id,
        honor,
        statement,
      );
      if (!response) {
        return res.status(454).send("Error: Update honor application failed");
      }
    } else {
      const response =
        await HnrHasFunc.update_honor_application_with_attachment(
          id,
          honor,
          statement,
          attachment_url,
        );
      if (!response) {
        return res.status(454).send("Error: Update honor application failed");
      }
    }
    return res.status(200).send(id);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

router.post("/honor/delete_one", async (req, res) => {
  try {
    const id: string = req.body.id;
    const student_uuid: string = req.body.student_uuid;

    if (!id || !student_uuid) {
      return res.status(450).send("Error: Missing id or student_uuid");
    }

    const application = await HnrHasFunc.query_honor_application(id);
    const role = await HnrHasFunc.query_user_role(student_uuid);
    if (!application) {
      return res.status(451).send("Error: No honor application found");
    } else if (
      application.student_uuid !== student_uuid &&
      role !== "counselor"
    ) {
      return res.status(452).send("Error: Invalid student_uuid");
    }

    const year: number = new Date().getFullYear();
    if (application.year !== year) {
      return res.status(453).send("Error: Invalid year");
    }

    const response = await HnrHasFunc.delete_honor_application(id);
    if (!response) {
      return res.status(454).send("Error: Delete honor application failed");
    }
    return res.status(200).send(id);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.post("/honor/update_status_one", async (req, res) => {
  try {
    const id: string = req.body.id;
    const status: string = req.body.status;
    const counselor_uuid: string = req.body.counselor_uuid;

    if (!id || !status || !counselor_uuid) {
      return res
        .status(450)
        .send("Error: Missing id or status or counselor_uuid");
    }

    const application = await HnrHasFunc.query_honor_application(id);
    const role = await HnrHasFunc.query_user_role(counselor_uuid);
    if (!application) {
      return res.status(451).send("Error: No honor application found");
    } else if (role !== "counselor") {
      return res.status(452).send("Error: Invalid counselor_uuid");
    }

    const response = await HnrHasFunc.update_honor_application_status(
      id,
      status,
    );
    if (!response) {
      return res
        .status(453)
        .send("Error: Update honor application status failed");
    }
    return res.status(200).send(id);
  } catch (err) {
    return res.status(500).send(err);
  }
});

// 获取导师列表
router.get(
  "/info/mentor/mentor_list",
  authenticate(["student", "teacher", "counselor"]),
  async (req, res) => {
    const role: string = req.auth.user.role;
    const user_uuid: string = req.auth.user.uuid;
    const mentor_query: any = await client.request(gql`
      query MyQuery {
        mentor_info(order_by: { available: desc, max_applicants: desc }) {
          achievement
          available
          background
          field
          intro
          max_applicants
          is_member
          dialogue_type
          mentor_uuid
          user {
            department
            email
            realname
          }
        }
      }
    `);

    const mentors: IMentor[] = await Promise.all(
      mentor_query.mentor_info.map(async (mentor_info: any) => {
        const total_application_aggregate: any = await client.request(
          gql`
            query MyQuery($mentor_uuid: uuid!, $year: Int!) {
              mentor_application_aggregate(
                where: {
                  _and: {
                    mentor_uuid: { _eq: $mentor_uuid }
                    year: { _eq: $year }
                  }
                }
              ) {
                aggregate {
                  count
                }
              }
            }
          `,
          {
            mentor_uuid: mentor_info.mentor_uuid,
            year: new Date().getFullYear(),
          },
        );
        const matched_application_aggregate: any = await client.request(
          gql`
            query MyQuery($mentor_uuid: uuid!, $year: Int!, $status: String!) {
              mentor_application_aggregate(
                where: {
                  _and: {
                    mentor_uuid: { _eq: $mentor_uuid }
                    _and: { year: { _eq: $year }, status: { _eq: $status } }
                  }
                }
              ) {
                aggregate {
                  count
                }
              }
            }
          `,
          {
            mentor_uuid: mentor_info.mentor_uuid,
            year: new Date().getFullYear(),
            status: "approved",
          },
        );
        const mentor: IMentor = {
          uuid: mentor_info.mentor_uuid,
          name: mentor_info.user.realname,
          dept: mentor_info.user.department,
          mail: mentor_info.user.email,
          intr: mentor_info.intro,
          bgnd: mentor_info.background,
          flds: mentor_info.field,
          achv: mentor_info.achievement,
          avail: mentor_info.available,
          is_mem: mentor_info.is_member,
          dig_type: mentor_info.dialogue_type,
          max_apl: mentor_info.max_applicants,
          tot_apl:
            total_application_aggregate.mentor_application_aggregate.aggregate
              .count,
          mat_apl:
            matched_application_aggregate.mentor_application_aggregate.aggregate
              .count,
        };
        return mentor;
      }),
    );
    if (role === "student" || role === "teacher") {
      return res
        .status(200)
        .send(
          mentors.filter(
            (mentor: IMentor) => mentor.avail || mentor.uuid === user_uuid,
          ),
        );
    } else if (role === "counselor") {
      return res
        .status(200)
        .send(
          mentors.sort((a: IMentor, b: IMentor) => (a.uuid > b.uuid ? 1 : -1)),
        );
    } else {
      return res.status(400).send("Error: Unauthorized");
    }
  },
);

// 获取时间表，自动创建新年份的时间表
router.get(
  "/info/mentor/schedule",
  authenticate(["student", "teacher", "counselor"]),
  async (req, res) => {
    try {
      const add_schedule_mutation: any = await client.request(
        gql`
          mutation MyMutation($activateIn: Int!) {
            insert_mentor_time_one(
              object: { activateIn: $activateIn }
              on_conflict: {
                constraint: mentor_time_pkey
                update_columns: activateIn
              }
            ) {
              start_A
              end_A
              start_B
              end_B
              start_C
              end_C
              start_D
              end_D
              start_E
              end_E
            }
          }
        `,
        {
          activateIn: new Date().getFullYear(),
        },
      );
      if (!add_schedule_mutation.insert_mentor_time_one) {
        console.log(add_schedule_mutation, new Date().getFullYear());
        return res.status(500).send("Error: Failed to get schedule");
      }
      const schedule: ISchedule = {
        A: {
          beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_A),
          end: new Date(add_schedule_mutation.insert_mentor_time_one.end_A),
          roles: ["teacher", "counselor"],
          prompt: "预备阶段：导师更新个人信息",
        } as ISchedulePeriod,
        B: {
          beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_B),
          end: new Date(add_schedule_mutation.insert_mentor_time_one.end_B),
          roles: ["student", "counselor"],
          prompt: "预备阶段：学生了解导师信息",
        } as ISchedulePeriod,
        C: {
          beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_C),
          end: new Date(add_schedule_mutation.insert_mentor_time_one.end_C),
          roles: ["student", "teacher", "counselor"],
          prompt: "第一阶段：自由申请与匹配",
        } as ISchedulePeriod,
        D: {
          beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_D),
          end: new Date(add_schedule_mutation.insert_mentor_time_one.end_D),
          roles: ["student", "teacher", "counselor"],
          prompt: "第二阶段：未匹配同学补选",
        } as ISchedulePeriod,
        E: {
          beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_E),
          end: new Date(add_schedule_mutation.insert_mentor_time_one.end_E),
          roles: ["student", "teacher", "counselor"],
          prompt: "第三阶段：系统随机分配",
        } as ISchedulePeriod,
      };
      return res.status(200).send(schedule);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 获取申请信息，根据身份返回导师被申请的/学生申请的/所有的
router.get(
  "/info/mentor/applications",
  authenticate(["student", "teacher", "counselor"]),
  async (req, res) => {
    try {
      const user_uuid: string = req.auth.user.uuid;
      const role: string = req.auth.user.role;

      if (role === "student") {
        const application_query: any = await client.request(
          gql`
            query MyQuery($student_uuid: uuid!) {
              mentor_application(
                where: { student_uuid: { _eq: $student_uuid } }
              ) {
                chat_status
                chat_confirm
                chat_time
                member_chat_status
                member_chat_confirm
                member_chat_time
                created_at
                id
                mentor_uuid
                statement
                status
                is_member
                year
                mentor {
                  department
                  email
                  realname
                }
              }
            }
          `,
          {
            student_uuid: user_uuid,
          },
        );
        const applications: IApplication[] =
          application_query.mentor_application.map((app: any) => {
            const mentor: IMentor = {
              uuid: app.mentor_uuid,
              name: app.mentor.realname,
              dept: app.mentor.department,
              mail: app.mentor.email,
            };
            const application: IApplication = {
              id: app.id,
              stmt: app.statement,
              created: app.created_at,
              year: app.year,
              status: app.status,
              is_mem: app.is_member,
              chat: app.chat_status,
              chat2: app.chat_confirm,
              chat_t: app.chat_time,
              mem_chat: app.member_chat_status,
              mem_chat2: app.member_chat_confirm,
              mem_chat_t: app.member_chat_time,
              men: mentor,
            };
            return application;
          });
        return res.status(200).send(applications);
      } else if (role === "teacher") {
        const applications_query: any = await client.request(
          gql`
            query MyQuery($mentor_uuid: uuid!) {
              mentor_application(
                where: { mentor_uuid: { _eq: $mentor_uuid } }
              ) {
                chat_status
                chat_confirm
                chat_time
                member_chat_status
                member_chat_confirm
                member_chat_time
                created_at
                id
                statement
                status
                student_uuid
                is_member
                year
                student {
                  class
                  department
                  email
                  phone
                  realname
                  student_no
                }
              }
            }
          `,
          {
            mentor_uuid: user_uuid,
          },
        );
        const applications: IApplication[] =
          applications_query.mentor_application.map((app: any) => {
            const student: IStudent = {
              uuid: app.student_uuid,
              name: app.student.realname,
              stid: app.student.student_no,
              dept: app.student.department,
              clss: app.student.class,
              mail: app.student.email,
              phon: app.student.phone,
            };
            const application: IApplication = {
              id: app.id,
              stmt: app.statement,
              created: app.created_at,
              year: app.year,
              status: app.status,
              is_mem: app.is_member,
              chat: app.chat_status,
              chat2: app.chat_confirm,
              chat_t: app.chat_time,
              mem_chat: app.member_chat_status,
              mem_chat2: app.member_chat_confirm,
              mem_chat_t: app.member_chat_time,
              stu: student,
            };
            return application;
          });
        return res.status(200).send(applications);
      } else if (role === "counselor") {
        const applications_query: any = await client.request(gql`
          query MyQuery {
            mentor_application {
              chat_status
              chat_confirm
              chat_time
              member_chat_status
              member_chat_confirm
              member_chat_time
              created_at
              id
              mentor_uuid
              statement
              status
              student_uuid
              is_member
              year
              mentor {
                department
                email
                phone
                realname
              }
              student {
                class
                department
                email
                phone
                realname
                student_no
              }
            }
          }
        `);
        const applications: IApplication[] =
          applications_query.mentor_application.map((app: any) => {
            const mentor: IMentor = {
              uuid: app.mentor_uuid,
              name: app.mentor.realname,
              dept: app.mentor.department,
              mail: app.mentor.email,
              phon: app.mentor.phone,
            };
            const student: IStudent = {
              uuid: app.student_uuid,
              name: app.student.realname,
              stid: app.student.student_no,
              dept: app.student.department,
              clss: app.student.class,
              mail: app.student.email,
              phon: app.student.phone,
            };
            const application: IApplication = {
              id: app.id,
              stmt: app.statement,
              created: app.created_at,
              year: app.year,
              status: app.status,
              is_mem: app.is_member,
              chat: app.chat_status,
              chat2: app.chat_confirm,
              chat_t: app.chat_time,
              mem_chat: app.member_chat_status,
              mem_chat2: app.member_chat_confirm,
              mem_chat_t: app.member_chat_time,
              men: mentor,
              stu: student,
            };
            return application;
          });
        return res
          .status(200)
          .send(
            applications.sort((a: IApplication, b: IApplication) =>
              a.id > b.id ? -1 : 1,
            ),
          );
      } else {
        return res.status(400).send("Error: Unauthorized");
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 导师获取自身信息，自动成为新生导师
router.get(
  "/info/mentor/mentor",
  authenticate(["teacher"]),
  async (req, res) => {
    try {
      const user_uuid: string = req.auth.user.uuid;

      const mentor_query: any = await client.request(
        gql`
          query MyQuery($mentor_uuid: uuid!) {
            mentor_info_by_pk(mentor_uuid: $mentor_uuid) {
              achievement
              available
              background
              field
              intro
              max_applicants
              is_member
              dialogue_type
              user {
                department
                email
                phone
                realname
              }
            }
          }
        `,
        {
          mentor_uuid: user_uuid,
        },
      );

      if (mentor_query.mentor_info_by_pk) {
        const application_query: any = await client.request(
          gql`
            query MyQuery($mentor_uuid: uuid!, $year: Int!) {
              mentor_application(
                where: {
                  _and: {
                    mentor_uuid: { _eq: $mentor_uuid }
                    year: { _eq: $year }
                  }
                }
              ) {
                status
              }
            }
          `,
          {
            mentor_uuid: user_uuid,
            year: new Date().getFullYear(),
          },
        );
        const mentor_info: any = mentor_query.mentor_info_by_pk;
        const total_applications: number =
          application_query.mentor_application.length;
        const matched_applications: number =
          application_query.mentor_application.filter(
            (application: any) => application.status === "approved",
          ).length;
        const mentor: IMentor = {
          uuid: user_uuid,
          name: mentor_info.user.realname,
          dept: mentor_info.user.department,
          mail: mentor_info.user.email,
          phon: mentor_info.user.phone,
          intr: mentor_info.intro,
          bgnd: mentor_info.background,
          flds: mentor_info.field,
          achv: mentor_info.achievement,
          avail: mentor_info.available,
          is_mem: mentor_info.is_member,
          dig_type: mentor_info.dialogue_type,
          max_apl: mentor_info.max_applicants,
          tot_apl: total_applications,
          mat_apl: matched_applications,
        };
        return res.status(200).send(mentor);
      } else {
        const add_mentor_mutation: any = await client.request(
          gql`
            mutation MyMutation(
              $mentor_uuid: uuid!
              $max_applicants: Int!
              $available: Boolean!
              $is_member: Boolean!
            ) {
              insert_mentor_info_one(
                object: {
                  mentor_uuid: $mentor_uuid
                  max_applicants: $max_applicants
                  available: $available
                  is_member: $is_member
                }
              ) {
                user {
                  department
                  email
                  phone
                  realname
                }
              }
            }
          `,
          {
            mentor_uuid: user_uuid,
            max_applicants: 5,
            available: false,
            is_member: false,
          },
        );
        if (!add_mentor_mutation.insert_mentor_info_one) {
          return res.status(500).send("Error: Add mentor failed");
        }
        const mentor_info: any = add_mentor_mutation.insert_mentor_info_one;
        const mentor: IMentor = {
          uuid: user_uuid,
          name: mentor_info.user.realname,
          dept: mentor_info.user.department,
          mail: mentor_info.user.email,
          phon: mentor_info.user.phone,
          intr: "",
          bgnd: "",
          flds: "",
          achv: "",
          avail: false,
          is_mem: false,
          dig_type: undefined,
          max_apl: 5,
          tot_apl: 0,
          mat_apl: 0,
        };
        return res.status(200).send(mentor);
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 获取新生信息
router.get(
  "/info/mentor/freshmen",
  authenticate(["student", "counselor"]),
  async (req, res) => {
    try {
      const role: string = req.auth.user.role;
      const user_uuid: string = req.auth.user.uuid;

      if (role === "student") {
        const student_no: string = req.auth.user.student_no;
        const realname: string = req.auth.user.realname;
        const freshman_query: any = await client.request(
          gql`
            query MyQuery(
              $year: Int!
              $realname: String!
              $student_no: String!
            ) {
              freshman(
                where: {
                  _and: {
                    year: { _eq: $year }
                    _and: {
                      realname: { _eq: $realname }
                      student_no: { _eq: $student_no }
                    }
                  }
                }
              ) {
                is_member
              }
            }
          `,
          {
            year: new Date().getFullYear(),
            realname: realname,
            student_no: student_no,
          },
        );
        if (freshman_query.freshman.length === 0) {
          return res.status(200).send([] as IFreshman[]);
        }
        const freshman: IFreshman = {
          name: realname,
          stid: student_no,
          uuid: user_uuid,
          is_mem: freshman_query.freshman[0].is_member,
        };
        return res.status(200).send([freshman]);
      } else if (role === "counselor") {
        const freshman_query: any = await client.request(
          gql`
            query MyQuery($year: Int!) {
              freshman(where: { year: { _eq: $year } }) {
                realname
                student_no
                uuid
                is_member
              }
            }
          `,
          {
            year: new Date().getFullYear(),
          },
        );
        const freshmen: IFreshman[] = await Promise.all(
          freshman_query.freshman.map(async (freshman: any) => {
            const user_query: any = await client.request(
              gql`
                query MyQuery($student_no: String!, $realname: String!) {
                  users(
                    where: {
                      _and: {
                        student_no: { _eq: $student_no }
                        realname: { _eq: $realname }
                      }
                    }
                  ) {
                    uuid
                  }
                }
              `,
              {
                student_no: freshman.student_no,
                realname: freshman.realname,
              },
            );
            const student: IFreshman = {
              name: freshman.realname,
              stid: freshman.student_no,
              is_mem: freshman.is_member,
              uuid:
                user_query.users.length > 0
                  ? user_query.users[0].uuid
                  : undefined,
            };
            return student;
          }),
        );
        return res.status(200).send(freshmen);
      } else {
        return res.status(400).send("Error: Unauthorized");
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新时间表
router.post(
  "/info/mentor/schedule",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      const schedule: ISchedule = req.body.schedule;
      const update_schedule_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $activateIn: Int!
            $start_A: timestamptz!
            $end_A: timestamptz!
            $start_B: timestamptz!
            $end_B: timestamptz!
            $start_C: timestamptz!
            $end_C: timestamptz!
            $start_D: timestamptz!
            $end_D: timestamptz!
            $start_E: timestamptz!
            $end_E: timestamptz!
          ) {
            update_mentor_time_by_pk(
              pk_columns: { activateIn: $activateIn }
              _set: {
                start_A: $start_A
                end_A: $end_A
                start_B: $start_B
                end_B: $end_B
                start_C: $start_C
                end_C: $end_C
                start_D: $start_D
                end_D: $end_D
                start_E: $start_E
                end_E: $end_E
              }
            ) {
              activateIn
            }
          }
        `,
        {
          activateIn: new Date().getFullYear(),
          start_A: schedule.A.beg,
          end_A: schedule.A.end,
          start_B: schedule.B.beg,
          end_B: schedule.B.end,
          start_C: schedule.C.beg,
          end_C: schedule.C.end,
          start_D: schedule.D.beg,
          end_D: schedule.D.end,
          start_E: schedule.E.beg,
          end_E: schedule.E.end,
        },
      );

      if (!update_schedule_mutation.update_mentor_time_by_pk) {
        return res.status(500).send("Error: Update schedule failed");
      }
      return res
        .status(200)
        .send(update_schedule_mutation.update_mentor_time_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新导师可申请状态
router.post(
  "/info/mentor/avail",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const available: boolean = req.body.available;
      const role: string = req.auth.user.role;
      const mentor_uuid: string =
        role === "teacher" ? req.auth.user.uuid : req.body.mentor_uuid;
      const update_avail_mutation: any = await client.request(
        gql`
          mutation MyMutation($mentor_uuid: uuid!, $available: Boolean!) {
            update_mentor_info_by_pk(
              pk_columns: { mentor_uuid: $mentor_uuid }
              _set: { available: $available }
            ) {
              available
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          available: available,
        },
      );
      if (!update_avail_mutation.update_mentor_info_by_pk) {
        return res.status(500).send("Error: Update available failed");
      }
      return res
        .status(200)
        .send(update_avail_mutation.update_mentor_info_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新导师可申请数量
router.post(
  "/info/mentor/max_app",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const max_applicants: number = req.body.max_applicants;
      const role: string = req.auth.user.role;
      const mentor_uuid: string =
        role === "teacher" ? req.auth.user.uuid : req.body.mentor_uuid;
      if (max_applicants < 5 || max_applicants > 10) {
        return res.status(400).send("Error: Invalid max_applicants");
      }
      const update_max_app_mutation: any = await client.request(
        gql`
          mutation MyMutation($mentor_uuid: uuid!, $max_applicants: Int!) {
            update_mentor_info_by_pk(
              pk_columns: { mentor_uuid: $mentor_uuid }
              _set: { max_applicants: $max_applicants }
            ) {
              max_applicants
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          max_applicants: max_applicants,
        },
      );
      if (!update_max_app_mutation.update_mentor_info_by_pk) {
        return res.status(500).send("Error: Update max_applicants failed");
      }
      return res
        .status(200)
        .send(update_max_app_mutation.update_mentor_info_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新导师是否参与党员谈话
router.post(
  "/info/mentor/member",
  // authenticate(["teacher", "counselor"]),
  authenticate(["counselor"]), // 仅限辅导员更新
  async (req, res) => {
    try {
      const is_member: boolean = req.body.is_member;
      const role: string = req.auth.user.role;
      const mentor_uuid: string =
        role === "teacher" ? req.auth.user.uuid : req.body.mentor_uuid;
      const update_member_mutation: any = await client.request(
        gql`
          mutation MyMutation($mentor_uuid: uuid!, $is_member: Boolean!) {
            update_mentor_info_by_pk(
              pk_columns: { mentor_uuid: $mentor_uuid }
              _set: { is_member: $is_member }
            ) {
              is_member
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          is_member: is_member,
        },
      );
      if (!update_member_mutation.update_mentor_info_by_pk) {
        return res.status(500).send("Error: Update is_member failed");
      }
      return res
        .status(200)
        .send(update_member_mutation.update_mentor_info_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新导师介绍
router.post(
  "/info/mentor/intro",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const role: string = req.auth.user.role;
      const mentor_uuid: string =
        role === "teacher" ? req.auth.user.uuid : req.body.mentor_uuid;
      const achv: string = req.body.achv;
      const bgnd: string = req.body.bgnd;
      const flds: string = req.body.flds;
      const intr: string = req.body.intr;
      const dig_type: string = req.body.dig_type;

      const update_intro_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $mentor_uuid: uuid!
            $achievement: String!
            $background: String!
            $field: String!
            $intro: String!
            $dialogue_type: String!
          ) {
            update_mentor_info_by_pk(
              pk_columns: { mentor_uuid: $mentor_uuid }
              _set: {
                achievement: $achievement
                background: $background
                field: $field
                intro: $intro
                dialogue_type: $dialogue_type
              }
            ) {
              achievement
              background
              field
              intro
              dialogue_type
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          achievement: achv,
          background: bgnd,
          field: flds,
          intro: intr,
          dialogue_type: dig_type,
        },
      );
      if (!update_intro_mutation.update_mentor_info_by_pk) {
        return res.status(500).send("Error: Update intro failed");
      }
      return res
        .status(200)
        .send(update_intro_mutation.update_mentor_info_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新申请状态
router.post(
  "/info/mentor/status",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const id: string = req.body.id; // 申请id
      const status: string = req.body.status; // 申请状态
      const user_uuid: string = req.auth.user.uuid; // 用户uuid

      const schedule_query: any = await client.request(
        gql`
          query MyQuery($activateIn: Int!) {
            mentor_time_by_pk(activateIn: $activateIn) {
              start_C
              end_C
              start_D
              end_D
            }
          }
        `,
        {
          activateIn: new Date().getFullYear(),
        },
      );
      if (!schedule_query.mentor_time_by_pk) {
        return res.status(500).send("Error: No schedule found");
      }

      const now: Date = new Date();
      const start_C: Date = new Date(schedule_query.mentor_time_by_pk.start_C);
      const end_C: Date = new Date(schedule_query.mentor_time_by_pk.end_C);
      const start_D: Date = new Date(schedule_query.mentor_time_by_pk.start_D);
      const end_D: Date = new Date(schedule_query.mentor_time_by_pk.end_D);
      if (now < start_C || now > end_D || (now > end_C && now < start_D)) {
        return res.status(400).send("Error: Invalid time");
      }

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              mentor_uuid
              year
              student {
                realname
                email
              }
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        user_uuid !== application_query.mentor_application_by_pk.mentor_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (
        new Date().getFullYear() !==
        application_query.mentor_application_by_pk.year
      ) {
        return res.status(400).send("Error: Invalid year");
      }

      const update_status_mutation: any = await client.request(
        gql`
          mutation MyMutation($id: uuid!, $status: String!) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { status: $status }
            ) {
              status
            }
          }
        `,
        {
          id: id,
          status: status,
        },
      );

      if (!update_status_mutation.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Update status failed");
      }

      res
        .status(200)
        .send(update_status_mutation.update_mentor_application_by_pk);

      if (
        application_query.mentor_application_by_pk.student.realname &&
        application_query.mentor_application_by_pk.student.email
      ) {
        await sendEmail(
          application_query.mentor_application_by_pk.student.email,
          `来自${req.auth.user.realname}老师的新生导师申请更新`,
          updateMentorApplicationTemplate(
            req.auth.user.realname,
            application_query.mentor_application_by_pk.student.realname,
            "https://eesast.com/#/info/mentor-applications",
          ),
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新申请陈述
router.post(
  "/info/mentor/application",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const id: string = req.body.id;
      const statement: string = req.body.statement;
      const user_uuid: string = req.auth.user.uuid;

      if (statement.length === 0) {
        return res.status(400).send("Error: Invalid statement");
      }

      const schedule_query: any = await client.request(
        gql`
          query MyQuery($activateIn: Int!) {
            mentor_time_by_pk(activateIn: $activateIn) {
              start_C
              end_C
              start_D
              end_D
            }
          }
        `,
        {
          activateIn: new Date().getFullYear(),
        },
      );
      if (!schedule_query.mentor_time_by_pk) {
        return res.status(500).send("Error: No schedule found");
      }

      const now: Date = new Date();
      const start_C: Date = new Date(schedule_query.mentor_time_by_pk.start_C);
      const end_C: Date = new Date(schedule_query.mentor_time_by_pk.end_C);
      const start_D: Date = new Date(schedule_query.mentor_time_by_pk.start_D);
      const end_D: Date = new Date(schedule_query.mentor_time_by_pk.end_D);
      if (now < start_C || now > end_D || (now > end_C && now < start_D)) {
        return res.status(400).send("Error: Invalid time");
      }

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              status
              student_uuid
              year
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        user_uuid !== application_query.mentor_application_by_pk.student_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (application_query.mentor_application_by_pk.status === "approved") {
        return res.status(400).send("Error: Application approved");
      }
      if (
        new Date().getFullYear() !==
        application_query.mentor_application_by_pk.year
      ) {
        return res.status(400).send("Error: Invalid year");
      }

      const update_application_mutation: any = await client.request(
        gql`
          mutation MyMutation($id: uuid!, $statement: String!) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { statement: $statement }
            ) {
              statement
            }
          }
        `,
        {
          id: id,
          statement: statement,
        },
      );

      if (!update_application_mutation.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Update application failed");
      }

      return res
        .status(200)
        .send(update_application_mutation.update_mentor_application_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新谈话状态
router.post(
  "/info/mentor/chat",
  authenticate(["student", "counselor"]),
  async (req, res) => {
    try {
      const id: string = req.body.id;
      const user_uuid: string = req.auth.user.uuid;
      const role: string = req.auth.user.role;

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              student_uuid
              chat_confirm
              status
              mentor {
                realname
                email
              }
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        role !== "counselor" &&
        user_uuid !== application_query.mentor_application_by_pk.student_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (application_query.mentor_application_by_pk.status !== "approved") {
        return res.status(400).send("Error: Application not approved");
      }
      if (application_query.mentor_application_by_pk.chat_confirm) {
        return res.status(400).send("Error: Chat confirmed");
      }

      const update_application_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $id: uuid!
            $chat_status: Boolean!
            $chat_time: timestamptz!
          ) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { chat_status: $chat_status, chat_time: $chat_time }
            ) {
              chat_status
              chat_time
            }
          }
        `,
        {
          id: id,
          chat_status: true,
          chat_time: new Date().toISOString(),
        },
      );

      if (!update_application_mutation.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Update chat_status failed");
      }
      res
        .status(200)
        .send(update_application_mutation.update_mentor_application_by_pk);
      if (
        application_query.mentor_application_by_pk.mentor.realname &&
        application_query.mentor_application_by_pk.mentor.email
      ) {
        await sendEmail(
          application_query.mentor_application_by_pk.mentor.email,
          `来自${req.auth.user.realname}同学的新生导师谈话记录`,
          newMentorApplicationTalkTemplate(
            application_query.mentor_application_by_pk.mentor.realname,
            req.auth.user.realname,
            "https://eesast.com/#/info/mentor-applications",
          ),
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新积极分子谈话状态
router.post(
  "/info/mentor/member_chat",
  authenticate(["student", "counselor"]),
  async (req, res) => {
    try {
      const id: string = req.body.id;
      const user_uuid: string = req.auth.user.uuid;
      const role: string = req.auth.user.role;

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              student_uuid
              is_member
              member_chat_confirm
              status
              mentor {
                realname
                email
              }
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        role !== "counselor" &&
        user_uuid !== application_query.mentor_application_by_pk.student_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (application_query.mentor_application_by_pk.status !== "approved") {
        return res.status(400).send("Error: Application not approved");
      }
      if (application_query.mentor_application_by_pk.member_chat_confirm) {
        return res.status(400).send("Error: Chat confirmed");
      }
      if (!application_query.mentor_application_by_pk.is_member) {
        return res.status(400).send("Error: Not a member");
      }

      const update_application_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $id: uuid!
            $member_chat_status: Boolean!
            $member_chat_time: timestamptz!
          ) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: {
                member_chat_status: $member_chat_status
                member_chat_time: $member_chat_time
              }
            ) {
              member_chat_status
              member_chat_time
            }
          }
        `,
        {
          id: id,
          member_chat_status: true,
          member_chat_time: new Date().toISOString(),
        },
      );

      if (!update_application_mutation.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Update member_chat_status failed");
      }
      res
        .status(200)
        .send(update_application_mutation.update_mentor_application_by_pk);
      if (
        application_query.mentor_application_by_pk.mentor.realname &&
        application_query.mentor_application_by_pk.mentor.email
      ) {
        await sendEmail(
          application_query.mentor_application_by_pk.mentor.email,
          `来自${req.auth.user.realname}同学的积极分子谈话记录`,
          newMentorApplicationMemberTalkTemplate(
            application_query.mentor_application_by_pk.mentor.realname,
            req.auth.user.realname,
            "https://eesast.com/#/info/mentor-applications",
          ),
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新谈话确认状态
router.post(
  "/info/mentor/confirm",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const id: string = req.body.id;
      const user_uuid: string = req.auth.user.uuid;
      const role: string = req.auth.user.role;

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              mentor_uuid
              chat_status
              status
              student {
                realname
                email
              }
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        role !== "counselor" &&
        user_uuid !== application_query.mentor_application_by_pk.mentor_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (application_query.mentor_application_by_pk.status !== "approved") {
        return res.status(400).send("Error: Application not approved");
      }
      if (!application_query.mentor_application_by_pk.chat_status) {
        return res.status(400).send("Error: Chat not started");
      }

      const update_application_mutation: any = await client.request(
        gql`
          mutation MyMutation($id: uuid!, $chat_confirm: Boolean!) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { chat_confirm: $chat_confirm }
            ) {
              chat_confirm
            }
          }
        `,
        {
          id: id,
          chat_confirm: true,
        },
      );

      if (!update_application_mutation.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Update chat_confirm failed");
      }
      res
        .status(200)
        .send(update_application_mutation.update_mentor_application_by_pk);

      if (
        application_query.mentor_application_by_pk.student.realname &&
        application_query.mentor_application_by_pk.student.email
      ) {
        await sendEmail(
          application_query.mentor_application_by_pk.student.email,
          `来自${req.auth.user.realname}老师的新生导师谈话记录确认`,
          updateMentorApplicationTalkTemplate(
            req.auth.user.realname,
            application_query.mentor_application_by_pk.student.realname,
            "https://eesast.com/#/info/mentor-applications",
          ),
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 更新积极分子谈话确认状态
router.post(
  "/info/mentor/member_confirm",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const id: string = req.body.id;
      const user_uuid: string = req.auth.user.uuid;
      const role: string = req.auth.user.role;

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              mentor_uuid
              is_member
              member_chat_status
              status
              student {
                realname
                email
              }
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        role !== "counselor" &&
        user_uuid !== application_query.mentor_application_by_pk.mentor_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (application_query.mentor_application_by_pk.status !== "approved") {
        return res.status(400).send("Error: Application not approved");
      }
      if (!application_query.mentor_application_by_pk.is_member) {
        return res.status(400).send("Error: Not a member");
      }
      if (!application_query.mentor_application_by_pk.member_chat_status) {
        return res.status(400).send("Error: Chat not started");
      }

      const update_application_mutation: any = await client.request(
        gql`
          mutation MyMutation($id: uuid!, $member_chat_confirm: Boolean!) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { member_chat_confirm: $member_chat_confirm }
            ) {
              member_chat_confirm
            }
          }
        `,
        {
          id: id,
          member_chat_confirm: true,
        },
      );

      if (!update_application_mutation.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Update member_chat_confirm failed");
      }
      res
        .status(200)
        .send(update_application_mutation.update_mentor_application_by_pk);

      if (
        application_query.mentor_application_by_pk.student.realname &&
        application_query.mentor_application_by_pk.student.email
      ) {
        await sendEmail(
          application_query.mentor_application_by_pk.student.email,
          `来自${req.auth.user.realname}老师的积极分子谈话记录确认`,
          updateMentorApplicationMemberTalkTemplate(
            req.auth.user.realname,
            application_query.mentor_application_by_pk.student.realname,
            "https://eesast.com/#/info/mentor-applications",
          ),
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 新增导师介绍
router.put(
  "/info/mentor/intro",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      const name: string = req.body.name;
      const intr: string = req.body.intr;
      const bgnd: string = req.body.bgnd;
      const flds: string = req.body.flds;
      const achv: string = req.body.achv;

      const user_query: any = await client.request(
        gql`
          query MyQuery($realname: String!) {
            users(where: { realname: { _eq: $realname } }) {
              uuid
            }
          }
        `,
        {
          realname: name,
        },
      );
      if (user_query.users.length === 0) {
        return res.status(400).send("Error: User not found");
      }
      const mentor_uuid: string = user_query.users[0].uuid;

      const add_mentor_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $achievement: String!
            $background: String!
            $field: String!
            $intro: String!
            $mentor_uuid: uuid!
          ) {
            insert_mentor_info_one(
              object: {
                achievement: $achievement
                background: $background
                field: $field
                intro: $intro
                mentor_uuid: $mentor_uuid
              }
              on_conflict: {
                constraint: mentor_info_pkey
                update_columns: [achievement, background, field, intro]
              }
            ) {
              mentor_uuid
            }
          }
        `,
        {
          achievement: achv,
          background: bgnd,
          field: flds,
          intro: intr,
          mentor_uuid: mentor_uuid,
        },
      );

      if (!add_mentor_mutation.insert_mentor_info_one) {
        return res.status(500).send("Error: Add mentor failed");
      }
      return res.status(200).send(add_mentor_mutation.insert_mentor_info_one);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 修改导师密码
router.post(
  "/info/mentor/password",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      const mentor_uuid: string = req.body.mentor_uuid;
      const password: string = req.body.password;

      if (!mentor_uuid || !password) {
        return res.status(400).send("Error: Invalid mentor_uuid or password");
      }
      if (!validator.validatePassword(password)) {
        return res.status(400).send("400 Bad Request: Invalid password format");
      }

      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const user_query: any = await client.request(
        gql`
          query MyQuery($mentor_uuid: uuid!) {
            users_by_pk(uuid: $mentor_uuid) {
              role
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
        },
      );
      if (!user_query.users_by_pk) {
        return res.status(400).send("Error: Mentor not found");
      }
      if (user_query.users_by_pk.role !== "teacher") {
        return res.status(400).send("Error: Mentor is not a teacher");
      }

      const update_password_mutation: any = await client.request(
        gql`
          mutation MyMutation($mentor_uuid: uuid!, $password: String!) {
            update_users_by_pk(
              pk_columns: { uuid: $mentor_uuid }
              _set: { password: $password }
            ) {
              uuid
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          password: password_hash,
        },
      );

      if (!update_password_mutation.update_users_by_pk) {
        return res.status(500).send("Error: Update password failed");
      }
      return res.status(200).send(update_password_mutation.update_users_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 新增申请
router.put(
  "/info/mentor/application",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const mentor_uuid: string = req.body.mentor_uuid;
      const statement: string = req.body.statement;
      const is_member: boolean = req.body.is_member;
      const user_uuid: string = req.auth.user.uuid;
      const student_no: string = req.auth.user.student_no;
      const realname: string = req.auth.user.realname;

      if (statement.length === 0) {
        return res.status(400).send("Error: Invalid statement");
      }

      const schedule_query: any = await client.request(
        gql`
          query MyQuery($activateIn: Int!) {
            mentor_time_by_pk(activateIn: $activateIn) {
              start_C
              end_C
              start_D
              end_D
            }
          }
        `,
        {
          activateIn: new Date().getFullYear(),
        },
      );
      if (!schedule_query.mentor_time_by_pk) {
        return res.status(500).send("Error: No schedule found");
      }

      const now: Date = new Date();
      const start_C: Date = new Date(schedule_query.mentor_time_by_pk.start_C);
      const end_C: Date = new Date(schedule_query.mentor_time_by_pk.end_C);
      const start_D: Date = new Date(schedule_query.mentor_time_by_pk.start_D);
      const end_D: Date = new Date(schedule_query.mentor_time_by_pk.end_D);
      if (now < start_C || now > end_D || (now > end_C && now < start_D)) {
        return res.status(400).send("Error: Invalid time");
      }

      const freshman_query: any = await client.request(
        gql`
          query MyQuery($realname: String!, $student_no: String!, $year: Int!) {
            freshman(
              where: {
                _and: {
                  _and: {
                    realname: { _eq: $realname }
                    student_no: { _eq: $student_no }
                  }
                  year: { _eq: $year }
                }
              }
            ) {
              uuid
              is_member
            }
          }
        `,
        {
          realname: realname,
          student_no: student_no,
          year: new Date().getFullYear(),
        },
      );
      if (freshman_query.freshman.length === 0) {
        return res.status(400).send("Error: Freshman not found");
      }
      if (!freshman_query.freshman[0].is_member && is_member) {
        return res.status(400).send("Error: Freshman not member");
      }

      const application_query: any = await client.request(
        gql`
          query MyQuery($student_uuid: uuid!, $year: Int!) {
            mentor_application_aggregate(
              where: {
                _and: {
                  student_uuid: { _eq: $student_uuid }
                  year: { _eq: $year }
                }
              }
            ) {
              aggregate {
                count
              }
            }
          }
        `,
        {
          student_uuid: user_uuid,
          year: new Date().getFullYear(),
        },
      );
      if (application_query.mentor_application_aggregate.aggregate.count >= 1) {
        return res.status(400).send("Error: Exceeds max_applicants");
      }

      const mentor_info_query: any = await client.request(
        gql`
          query MyQuery($mentor_uuid: uuid!) {
            mentor_info_by_pk(mentor_uuid: $mentor_uuid) {
              max_applicants
              is_member
              user {
                email
                realname
              }
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
        },
      );
      if (!mentor_info_query.mentor_info_by_pk) {
        return res.status(400).send("Error: Mentor not found");
      }

      if (!mentor_info_query.mentor_info_by_pk.is_member && is_member) {
        return res.status(400).send("Error: Mentor not member");
      }

      const total_application_aggregate: any = await client.request(
        gql`
          query MyQuery($mentor_uuid: uuid!, $year: Int!) {
            mentor_application_aggregate(
              where: {
                _and: {
                  mentor_uuid: { _eq: $mentor_uuid }
                  year: { _eq: $year }
                }
              }
            ) {
              aggregate {
                count
              }
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          year: new Date().getFullYear(),
        },
      );

      if (
        total_application_aggregate.mentor_application_aggregate.aggregate
          .count >= mentor_info_query.mentor_info_by_pk.max_applicants
      ) {
        return res.status(400).send("Error: Exceeds max_applicants");
      }

      const add_application_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $mentor_uuid: uuid!
            $student_uuid: uuid!
            $statement: String!
            $year: Int!
            $is_member: Boolean!
          ) {
            insert_mentor_application_one(
              object: {
                mentor_uuid: $mentor_uuid
                student_uuid: $student_uuid
                statement: $statement
                year: $year
                is_member: $is_member
              }
            ) {
              id
            }
          }
        `,
        {
          mentor_uuid: mentor_uuid,
          student_uuid: user_uuid,
          statement: statement,
          year: new Date().getFullYear(),
          is_member: is_member,
        },
      );

      if (!add_application_mutation.insert_mentor_application_one) {
        return res.status(500).send("Error: Add application failed");
      }
      res
        .status(200)
        .send(add_application_mutation.insert_mentor_application_one);

      if (
        mentor_info_query.mentor_info_by_pk.user.email &&
        mentor_info_query.mentor_info_by_pk.user.realname
      ) {
        await sendEmail(
          mentor_info_query.mentor_info_by_pk.user.email,
          `来自${req.auth.user.realname}同学的新生导师申请`,
          newMentorApplicationTemplate(
            mentor_info_query.mentor_info_by_pk.user.realname,
            req.auth.user.realname,
            "https://eesast.com/#/info/mentor-applications",
          ),
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 新增新生
router.put(
  "/info/mentor/freshman",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      const name: string = req.body.name;
      const stid: string = req.body.stid;
      const is_mem: boolean = req.body.is_mem;

      const add_freshman_mutation: any = await client.request(
        gql`
          mutation MyMutation(
            $realname: String!
            $student_no: String!
            $year: Int!
            $is_member: Boolean!
          ) {
            insert_freshman_one(
              object: {
                realname: $realname
                student_no: $student_no
                year: $year
                is_member: $is_member
              }
            ) {
              uuid
            }
          }
        `,
        {
          realname: name,
          student_no: stid,
          year: new Date().getFullYear(),
          is_member: is_mem,
        },
      );

      if (!add_freshman_mutation.insert_freshman_one) {
        return res.status(500).send("Error: Add freshman failed");
      }
      return res.status(200).send(add_freshman_mutation.insert_freshman_one);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

// 删除申请
router.post(
  "/info/mentor/delete",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const id: string = req.body.id;
      const user_uuid: string = req.auth.user.uuid;

      const schedule_query: any = await client.request(
        gql`
          query MyQuery($activateIn: Int!) {
            mentor_time_by_pk(activateIn: $activateIn) {
              start_C
              end_C
              start_D
              end_D
            }
          }
        `,
        {
          activateIn: new Date().getFullYear(),
        },
      );
      if (!schedule_query.mentor_time_by_pk) {
        return res.status(500).send("Error: No schedule found");
      }

      const now: Date = new Date();
      const start_C: Date = new Date(schedule_query.mentor_time_by_pk.start_C);
      const end_C: Date = new Date(schedule_query.mentor_time_by_pk.end_C);
      const start_D: Date = new Date(schedule_query.mentor_time_by_pk.start_D);
      const end_D: Date = new Date(schedule_query.mentor_time_by_pk.end_D);
      if (now < start_C || now > end_D || (now > end_C && now < start_D)) {
        return res.status(400).send("Error: Invalid time");
      }

      const application_query: any = await client.request(
        gql`
          query MyQuery($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              status
              student_uuid
              year
            }
          }
        `,
        {
          id: id,
        },
      );

      if (!application_query.mentor_application_by_pk) {
        return res.status(400).send("Error: Application not found");
      }
      if (
        user_uuid !== application_query.mentor_application_by_pk.student_uuid
      ) {
        return res.status(400).send("Error: Unauthorized");
      }
      if (application_query.mentor_application_by_pk.status === "approved") {
        return res.status(400).send("Error: Application has been approved");
      }
      if (
        new Date().getFullYear() !==
        application_query.mentor_application_by_pk.year
      ) {
        return res.status(400).send("Error: Invalid year");
      }

      const delete_application_mutation: any = await client.request(
        gql`
          mutation MyMutation($id: uuid!) {
            delete_mentor_application_by_pk(id: $id) {
              id
            }
          }
        `,
        {
          id: id,
        },
      );
      if (!delete_application_mutation.delete_mentor_application_by_pk) {
        return res.status(500).send("Error: Delete application failed");
      }
      return res
        .status(200)
        .send(delete_application_mutation.delete_mentor_application_by_pk);
    } catch (err) {
      console.log(err);
      return res.status(500);
    }
  },
);

router.get("/semester", async (req, res) => {
  try {
    const curr_semester = await get_current_semester();
    if (!curr_semester) {
      return res.status(500).send("Error: No semester found");
    }
    return res.status(200).send(curr_semester);
  } catch (err) {
    console.log(err);
    return res.status(500);
  }
});

router.post("/set_semester", authenticate(["counselor"]), async (req, res) => {
  try {
    const semester: string = req.body.semester;
    if (!semester) {
      return res.status(400).send("Error: Invalid semester");
    }
    const result = await set_current_semester(semester);
    if (!result) {
      return res.status(500).send("Error: Set semester failed");
    }
    return res.status(200).json({ affected_rows: result });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
});

router.get("/semester_list", authenticate(["counselor"]), async (req, res) => {
  try {
    const list = await get_semester_list();
    return res.status(200).json(list);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
});

router.post("/add_semester", authenticate(["counselor"]), async (req, res) => {
  try {
    const semester: string = req.body.semester;
    if (!semester) {
      return res.status(400).send("Error: Invalid semester");
    }
    const result = await add_semester(semester);
    if (!result) {
      return res.status(500).send("Error: Add semester failed");
    }
    return res.status(200).json({ semester: result });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
});

router.delete(
  "/delete_semester",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      const semester: string = req.body.semester;
      if (!semester) {
        return res.status(400).send("Error: Invalid semester");
      }
      const result = await delete_semester(semester);
      if (!result) {
        return res.status(500).send("Error: Delete semester failed");
      }
      return res.status(200).json({ semester: result });
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// ==================== 积极分子谈话记录（新系统：基于 member_chat_record 表） ====================

// 学生查询自己的所有积极分子谈话记录（同时返回 is_member 和当前学期）
router.get(
  "/info/mentor/my_member_chats",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const user_uuid: string = req.auth.user.uuid;

      // 通过已通过的申请查询其导师是否参与积极分子谈话
      const appl_query: any = await client.request(
        gql`
          query GetApprovedMentorForStudent($student_uuid: uuid!) {
            mentor_application(
              where: {
                student_uuid: { _eq: $student_uuid }
                status: { _eq: "approved" }
              }
              limit: 1
            ) {
              mentor_uuid
            }
          }
        `,
        { student_uuid: user_uuid },
      );
      let is_member: boolean = false;
      const approved_mentor_uuid =
        appl_query.mentor_application?.[0]?.mentor_uuid;
      if (approved_mentor_uuid) {
        const mentor_check: any = await client.request(
          gql`
            query GetMentorIsMember($mentor_uuid: uuid!) {
              mentor_info_by_pk(mentor_uuid: $mentor_uuid) {
                is_member
              }
            }
          `,
          { mentor_uuid: approved_mentor_uuid },
        );
        is_member = mentor_check.mentor_info_by_pk?.is_member ?? false;
      }
      if (is_member) {
        const freshman_check: any = await client.request(
          gql`
            query GetFreshmanIsMember($student_uuid: uuid!) {
              freshman(where: { uuid: { _eq: $student_uuid } }) {
                is_member
              }
            }
          `,
          { student_uuid: user_uuid },
        );
        if (freshman_check.freshman.length > 0) {
          is_member = freshman_check.freshman[0].is_member ?? false;
        } else {
          // 如果没有找到对应的 freshman 记录，默认不是成员（或根据实际需求调整）
          is_member = false;
        }
      }

      // 获取当前学期
      const current_semester = await get_current_semester();

      // 查询新系统数据（member_chat_record 表）
      const records_query: any = await client.request(
        gql`
          query GetMemberChatRecords($user_id: uuid!) {
            member_chat_record(
              where: { user_id: { _eq: $user_id } }
              order_by: { updated_at: desc }
            ) {
              id
              updated_at
              user_id
              semester
              member_chat_confirm
            }
          }
        `,
        { user_id: user_uuid },
      );

      // 查询旧系统数据（mentor_application 表）
      const old_records_query: any = await client.request(
        gql`
          query GetOldMemberChatRecords($student_uuid: uuid!) {
            mentor_application(
              where: {
                student_uuid: { _eq: $student_uuid }
                member_chat_status: { _eq: true }
              }
              order_by: { member_chat_time: desc }
            ) {
              id
              member_chat_time
              member_chat_confirm
            }
          }
        `,
        { student_uuid: user_uuid },
      );

      // 合并旧数据（学期为空字符串）
      const legacy_records = (old_records_query.mentor_application ?? []).map(
        (app: any) => ({
          id: app.id,
          updated_at: app.member_chat_time,
          user_id: user_uuid,
          semester: "", // 旧系统标记
          member_chat_confirm: app.member_chat_confirm ?? false,
          application_id: app.id, // 用于下载
        }),
      );

      const all_records = [
        ...legacy_records,
        ...(records_query.member_chat_record ?? []),
      ];

      return res.status(200).json({
        is_member,
        current_semester,
        records: all_records,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 学生提交积极分子谈话记录（对当前学期插入/更新记录，文件已由前端上传至 COS）
router.post(
  "/info/mentor/member_chat_submit",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const user_uuid: string = req.auth.user.uuid;

      // 权限：查询已通过申请的导师是否参与积极分子谈话
      const appl_query: any = await client.request(
        gql`
          query GetApprovedMentorForStudent($student_uuid: uuid!) {
            mentor_application(
              where: {
                student_uuid: { _eq: $student_uuid }
                status: { _eq: "approved" }
              }
              limit: 1
            ) {
              mentor_uuid
            }
          }
        `,
        { student_uuid: user_uuid },
      );
      const approved_mentor_uuid =
        appl_query.mentor_application?.[0]?.mentor_uuid;
      let is_member: boolean = false;
      if (approved_mentor_uuid) {
        const mentor_check: any = await client.request(
          gql`
            query GetMentorIsMember($mentor_uuid: uuid!) {
              mentor_info_by_pk(mentor_uuid: $mentor_uuid) {
                is_member
              }
            }
          `,
          { mentor_uuid: approved_mentor_uuid },
        );
        is_member = mentor_check.mentor_info_by_pk?.is_member ?? false;
      }
      if (!is_member) {
        return res.status(403).send("Error: Not a member");
      }

      // 获取当前学期
      const current_semester = await get_current_semester();
      if (!current_semester) {
        return res.status(400).send("Error: No current semester");
      }
      console.log(`Current semester: ${current_semester}`);
      // 查询当前学期是否已有记录
      const existing_query: any = await client.request(
        gql`
          query CheckExistingRecord($user_id: uuid!, $semester: String!) {
            member_chat_record(
              where: {
                user_id: { _eq: $user_id }
                semester: { _eq: $semester }
              }
            ) {
              id
              member_chat_confirm
            }
          }
        `,
        { user_id: user_uuid, semester: current_semester },
      );
      const existing = existing_query.member_chat_record?.[0];

      if (existing?.member_chat_confirm) {
        return res
          .status(400)
          .send("Error: Chat already confirmed for this semester");
      }

      let result: any;
      if (existing) {
        // 已有记录：更新 updated_at（触发器会自动更新，这里显式写入时间保证及时性）
        const update_mut: any = await client.request(
          gql`
            mutation UpdateMemberChatRecord($id: uuid!, $now: timestamptz!) {
              update_member_chat_record_by_pk(
                pk_columns: { id: $id }
                _set: { updated_at: $now }
              ) {
                id
                updated_at
                user_id
                semester
                member_chat_confirm
              }
            }
          `,
          { id: existing.id, now: new Date().toISOString() },
        );
        result = update_mut.update_member_chat_record_by_pk;
      } else {
        // 新增记录
        const insert_mut: any = await client.request(
          gql`
            mutation InsertMemberChatRecord(
              $user_id: uuid!
              $semester: String!
            ) {
              insert_member_chat_record_one(
                object: { user_id: $user_id, semester: $semester }
              ) {
                id
                updated_at
                user_id
                semester
                member_chat_confirm
              }
            }
          `,
          { user_id: user_uuid, semester: current_semester },
        );
        result = insert_mut.insert_member_chat_record_one;
      }

      if (!result) {
        return res.status(500).send("Error: Submit failed");
      }
      return res.status(200).json(result);
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 导师/辅导员确认积极分子谈话记录
router.post(
  "/info/mentor/member_chat_confirm",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const record_id: string = req.body.record_id;
      const operator_uuid: string = req.auth.user.uuid;
      const operator_role: string = req.auth.user.role;
      if (!record_id) {
        return res.status(400).send("Error: Missing record_id");
      }

      // 查询记录是否存在
      const record_query: any = await client.request(
        gql`
          query GetMemberChatRecord($id: uuid!) {
            member_chat_record_by_pk(id: $id) {
              id
              user_id
              semester
              member_chat_confirm
            }
          }
        `,
        { id: record_id },
      );

      // 新系统数据处理
      if (record_query.member_chat_record_by_pk) {
        if (record_query.member_chat_record_by_pk.member_chat_confirm) {
          return res.status(400).send("Error: Already confirmed");
        }

        // 导师需额外验证该学生是自己已通过的学生
        if (operator_role === "teacher") {
          const student_uuid = record_query.member_chat_record_by_pk.user_id;
          const appl_check: any = await client.request(
            gql`
              query CheckTeacherStudent(
                $mentor_uuid: uuid!
                $student_uuid: uuid!
              ) {
                mentor_application(
                  where: {
                    mentor_uuid: { _eq: $mentor_uuid }
                    student_uuid: { _eq: $student_uuid }
                    status: { _eq: "approved" }
                  }
                ) {
                  student_uuid
                }
              }
            `,
            { mentor_uuid: operator_uuid, student_uuid },
          );
          if (appl_check.mentor_application.length === 0) {
            return res.status(403).send("Error: Not your student");
          }
        }

        const update_mut: any = await client.request(
          gql`
            mutation ConfirmMemberChatRecord($id: uuid!) {
              update_member_chat_record_by_pk(
                pk_columns: { id: $id }
                _set: { member_chat_confirm: true }
              ) {
                id
                member_chat_confirm
                semester
                user_id
              }
            }
          `,
          { id: record_id },
        );

        if (!update_mut.update_member_chat_record_by_pk) {
          return res.status(500).send("Error: Confirm failed");
        }
        return res.status(200).json(update_mut.update_member_chat_record_by_pk);
      }

      // 旧系统数据处理：尝试从 mentor_application 表查询
      const old_record_query: any = await client.request(
        gql`
          query GetOldMemberChatRecord($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              id
              student_uuid
              mentor_uuid
              status
              is_member
              member_chat_status
              member_chat_confirm
            }
          }
        `,
        { id: record_id },
      );

      if (!old_record_query.mentor_application_by_pk) {
        return res.status(404).send("Error: Record not found");
      }

      const old_app = old_record_query.mentor_application_by_pk;
      if (
        old_app.status !== "approved" ||
        !old_app.is_member ||
        !old_app.member_chat_status
      ) {
        return res.status(404).send("Error: Not a valid member chat record");
      }
      if (old_app.member_chat_confirm) {
        return res.status(400).send("Error: Already confirmed");
      }

      // 导师需验证该学生是自己的
      if (
        operator_role === "teacher" &&
        old_app.mentor_uuid !== operator_uuid
      ) {
        return res.status(403).send("Error: Not your student");
      }

      // 更新旧系统字段
      const update_old_mut: any = await client.request(
        gql`
          mutation ConfirmOldMemberChatRecord($id: uuid!) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { member_chat_confirm: true }
            ) {
              id
              member_chat_confirm
              student_uuid
            }
          }
        `,
        { id: record_id },
      );

      if (!update_old_mut.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Confirm failed");
      }
      return res.status(200).json({
        id: record_id,
        member_chat_confirm: true,
        semester: "",
        user_id: old_app.student_uuid,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 辅导员获取所有积极分子谈话记录
router.get(
  "/info/mentor/all_member_chats",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      // 查询新系统数据
      const query: any = await client.request(gql`
        query GetAllMemberChatRecords {
          member_chat_record(order_by: { updated_at: desc }) {
            id
            updated_at
            user_id
            semester
            member_chat_confirm
            user {
              realname
              student_no
              department
              class
            }
          }
        }
      `);

      // 查询旧系统数据
      const old_query: any = await client.request(gql`
        query GetAllOldMemberChatRecords {
          mentor_application(
            where: { member_chat_status: { _eq: true } }
            order_by: { member_chat_time: desc }
          ) {
            id
            student_uuid
            member_chat_time
            member_chat_confirm
            student {
              realname
              student_no
              department
              class
            }
          }
        }
      `);

      // 转换旧数据格式
      const legacy_records = (old_query.mentor_application ?? []).map(
        (app: any) => ({
          id: app.id,
          updated_at: app.member_chat_time,
          user_id: app.student_uuid,
          semester: "",
          member_chat_confirm: app.member_chat_confirm ?? false,
          application_id: app.id,
          user: app.student,
        }),
      );

      const all_records = [
        ...legacy_records,
        ...(query.member_chat_record ?? []),
      ];

      return res.status(200).json(all_records);
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 老师获取自己指导的学生的积极分子谈话记录（仅已通过申请的学生）
router.get(
  "/info/mentor/my_students_member_chats",
  authenticate(["teacher"]),
  async (req, res) => {
    try {
      const mentor_uuid: string = req.auth.user.uuid;

      // 先检查该老师是否参与积极分子谈话
      const mentor_check: any = await client.request(
        gql`
          query CheckTeacherIsMember($mentor_uuid: uuid!) {
            mentor_info_by_pk(mentor_uuid: $mentor_uuid) {
              is_member
            }
          }
        `,
        { mentor_uuid },
      );
      if (!mentor_check.mentor_info_by_pk?.is_member) {
        return res.status(200).json([]);
      }

      // 再查该老师所有已通过申请的学生 uuid
      const applications_query: any = await client.request(
        gql`
          query GetApprovedStudents($mentor_uuid: uuid!) {
            mentor_application(
              where: {
                mentor_uuid: { _eq: $mentor_uuid }
                status: { _eq: "approved" }
              }
            ) {
              student_uuid
              year
              student {
                realname
                student_no
                department
                class
              }
            }
          }
        `,
        { mentor_uuid },
      );

      const approved = applications_query?.mentor_application ?? [];
      if (approved.length === 0) {
        return res.status(200).json([]);
      }

      const student_uuids: string[] = approved.map((a: any) => a.student_uuid);

      // 查询新系统数据（member_chat_record 表）
      const records_query: any = await client.request(
        gql`
          query GetStudentsMemberChatRecords($student_uuids: [uuid!]!) {
            member_chat_record(
              where: { user_id: { _in: $student_uuids } }
              order_by: { updated_at: desc }
            ) {
              id
              updated_at
              user_id
              semester
              member_chat_confirm
              user {
                realname
                student_no
                department
                class
              }
            }
          }
        `,
        { student_uuids },
      );

      // 查询旧系统数据（mentor_application 表）
      const old_applications_query: any = await client.request(
        gql`
          query GetOldMemberChatApplications($mentor_uuid: uuid!) {
            mentor_application(
              where: {
                mentor_uuid: { _eq: $mentor_uuid }
                status: { _eq: "approved" }
                member_chat_status: { _eq: true }
              }
              order_by: { member_chat_time: desc }
            ) {
              id
              student_uuid
              member_chat_time
              member_chat_confirm
              student {
                realname
                student_no
                department
                class
              }
            }
          }
        `,
        { mentor_uuid },
      );

      // 转换旧数据格式
      const legacy_records = (
        old_applications_query.mentor_application ?? []
      ).map((app: any) => ({
        id: app.id,
        updated_at: app.member_chat_time,
        user_id: app.student_uuid,
        semester: "", // 旧系统标记
        member_chat_confirm: app.member_chat_confirm ?? false,
        application_id: app.id, // 用于下载
        user: app.student,
      }));

      const all_records = [
        ...legacy_records,
        ...(records_query.member_chat_record ?? []),
      ];

      return res.status(200).json(all_records);
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// ==================== 普通谈话记录（新系统：基于 mentor_talk_record 表） ====================

// 学生查询自己的所有谈话记录（同时返回 in_freshman 和当前学期）
router.get(
  "/info/mentor/my_talk_records",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const user_uuid: string = req.auth.user.uuid;
      const student_no: string = req.auth.user.student_no;

      // 检查是否在 freshman 表中
      const freshman_query: any = await client.request(
        gql`
          query CheckIsFreshman($student_no: String!) {
            freshman(where: { student_no: { _eq: $student_no } }) {
              student_no
            }
          }
        `,
        { student_no },
      );
      const in_freshman: boolean = (freshman_query.freshman?.length ?? 0) > 0;

      const current_semester = await get_current_semester();

      // 查询新系统数据（mentor_talk_record 表）
      const records_query: any = await client.request(
        gql`
          query GetMentorTalkRecords($user_id: uuid!) {
            mentor_talk_record(
              where: { user_id: { _eq: $user_id } }
              order_by: { updated_at: desc }
            ) {
              id
              updated_at
              user_id
              semester
              mentor_talk_confirm
            }
          }
        `,
        { user_id: user_uuid },
      );

      // 查询旧系统数据（mentor_application 表）
      const old_records_query: any = await client.request(
        gql`
          query GetOldMentorTalkRecords($student_uuid: uuid!) {
            mentor_application(
              where: {
                student_uuid: { _eq: $student_uuid }
                chat_status: { _eq: true }
              }
              order_by: { chat_time: desc }
            ) {
              id
              chat_time
              chat_confirm
            }
          }
        `,
        { student_uuid: user_uuid },
      );

      // 合并旧数据（学期为空字符串）
      const legacy_records = (old_records_query.mentor_application ?? []).map(
        (app: any) => ({
          id: app.id,
          updated_at: app.chat_time,
          user_id: user_uuid,
          semester: "", // 旧系统标记
          mentor_talk_confirm: app.chat_confirm ?? false,
          application_id: app.id, // 用于下载
        }),
      );

      const all_records = [
        ...legacy_records,
        ...(records_query.mentor_talk_record ?? []),
      ];

      return res.status(200).json({
        in_freshman,
        current_semester,
        records: all_records,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 学生提交谈话记录
router.post(
  "/info/mentor/talk_submit",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const user_uuid: string = req.auth.user.uuid;
      const student_no: string = req.auth.user.student_no;

      // 权限：是否在 freshman 表中
      const freshman_query: any = await client.request(
        gql`
          query CheckIsFreshman($student_no: String!) {
            freshman(where: { student_no: { _eq: $student_no } }) {
              student_no
            }
          }
        `,
        { student_no },
      );
      if ((freshman_query.freshman?.length ?? 0) === 0) {
        return res.status(403).send("Error: Not a freshman");
      }

      const current_semester = await get_current_semester();
      if (!current_semester) {
        return res.status(400).send("Error: No current semester");
      }

      const existing_query: any = await client.request(
        gql`
          query CheckExistingTalkRecord($user_id: uuid!, $semester: String!) {
            mentor_talk_record(
              where: {
                user_id: { _eq: $user_id }
                semester: { _eq: $semester }
              }
            ) {
              id
              mentor_talk_confirm
            }
          }
        `,
        { user_id: user_uuid, semester: current_semester },
      );
      const existing = existing_query.mentor_talk_record?.[0];

      if (existing?.mentor_talk_confirm) {
        return res
          .status(400)
          .send("Error: Talk already confirmed for this semester");
      }

      let result: any;
      if (existing) {
        const update_mut: any = await client.request(
          gql`
            mutation UpdateMentorTalkRecord($id: uuid!, $now: timestamptz!) {
              update_mentor_talk_record_by_pk(
                pk_columns: { id: $id }
                _set: { updated_at: $now }
              ) {
                id
                updated_at
                user_id
                semester
                mentor_talk_confirm
              }
            }
          `,
          { id: existing.id, now: new Date().toISOString() },
        );
        result = update_mut.update_mentor_talk_record_by_pk;
      } else {
        const insert_mut: any = await client.request(
          gql`
            mutation InsertMentorTalkRecord(
              $user_id: uuid!
              $semester: String!
            ) {
              insert_mentor_talk_record_one(
                object: { user_id: $user_id, semester: $semester }
              ) {
                id
                updated_at
                user_id
                semester
                mentor_talk_confirm
              }
            }
          `,
          { user_id: user_uuid, semester: current_semester },
        );
        result = insert_mut.insert_mentor_talk_record_one;
      }

      if (!result) {
        return res.status(500).send("Error: Submit failed");
      }
      return res.status(200).json(result);
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 导师/辅导员确认谈话记录
router.post(
  "/info/mentor/talk_confirm",
  authenticate(["teacher", "counselor"]),
  async (req, res) => {
    try {
      const record_id: string = req.body.record_id;
      const operator_uuid: string = req.auth.user.uuid;
      const operator_role: string = req.auth.user.role;
      if (!record_id) {
        return res.status(400).send("Error: Missing record_id");
      }

      const record_query: any = await client.request(
        gql`
          query GetMentorTalkRecord($id: uuid!) {
            mentor_talk_record_by_pk(id: $id) {
              id
              user_id
              semester
              mentor_talk_confirm
            }
          }
        `,
        { id: record_id },
      );

      // 新系统数据处理
      if (record_query.mentor_talk_record_by_pk) {
        if (record_query.mentor_talk_record_by_pk.mentor_talk_confirm) {
          return res.status(400).send("Error: Already confirmed");
        }

        // 导师需验证该学生是自己已通过的学生
        if (operator_role === "teacher") {
          const student_uuid = record_query.mentor_talk_record_by_pk.user_id;
          const appl_check: any = await client.request(
            gql`
              query CheckTeacherStudent(
                $mentor_uuid: uuid!
                $student_uuid: uuid!
              ) {
                mentor_application(
                  where: {
                    mentor_uuid: { _eq: $mentor_uuid }
                    student_uuid: { _eq: $student_uuid }
                    status: { _eq: "approved" }
                  }
                ) {
                  student_uuid
                }
              }
            `,
            { mentor_uuid: operator_uuid, student_uuid },
          );
          if (appl_check.mentor_application.length === 0) {
            return res.status(403).send("Error: Not your student");
          }
        }

        const update_mut: any = await client.request(
          gql`
            mutation ConfirmMentorTalkRecord($id: uuid!) {
              update_mentor_talk_record_by_pk(
                pk_columns: { id: $id }
                _set: { mentor_talk_confirm: true }
              ) {
                id
                mentor_talk_confirm
                semester
                user_id
              }
            }
          `,
          { id: record_id },
        );

        if (!update_mut.update_mentor_talk_record_by_pk) {
          return res.status(500).send("Error: Confirm failed");
        }
        return res.status(200).json(update_mut.update_mentor_talk_record_by_pk);
      }

      // 旧系统数据处理：尝试从 mentor_application 表查询
      const old_record_query: any = await client.request(
        gql`
          query GetOldTalkRecord($id: uuid!) {
            mentor_application_by_pk(id: $id) {
              id
              student_uuid
              mentor_uuid
              status
              chat_status
              chat_confirm
            }
          }
        `,
        { id: record_id },
      );

      if (!old_record_query.mentor_application_by_pk) {
        return res.status(404).send("Error: Record not found");
      }

      const old_app = old_record_query.mentor_application_by_pk;
      if (old_app.status !== "approved" || !old_app.chat_status) {
        return res.status(404).send("Error: Not a valid talk record");
      }
      if (old_app.chat_confirm) {
        return res.status(400).send("Error: Already confirmed");
      }

      // 导师需验证该学生是自己的
      if (
        operator_role === "teacher" &&
        old_app.mentor_uuid !== operator_uuid
      ) {
        return res.status(403).send("Error: Not your student");
      }

      // 更新旧系统字段
      const update_old_mut: any = await client.request(
        gql`
          mutation ConfirmOldTalkRecord($id: uuid!) {
            update_mentor_application_by_pk(
              pk_columns: { id: $id }
              _set: { chat_confirm: true }
            ) {
              id
              chat_confirm
              student_uuid
            }
          }
        `,
        { id: record_id },
      );

      if (!update_old_mut.update_mentor_application_by_pk) {
        return res.status(500).send("Error: Confirm failed");
      }
      return res.status(200).json({
        id: record_id,
        mentor_talk_confirm: true,
        semester: "",
        user_id: old_app.student_uuid,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 辅导员获取所有谈话记录
router.get(
  "/info/mentor/all_talk_records",
  authenticate(["counselor"]),
  async (req, res) => {
    try {
      // 查询新系统数据
      const query: any = await client.request(gql`
        query GetAllMentorTalkRecords {
          mentor_talk_record(order_by: { updated_at: desc }) {
            id
            updated_at
            user_id
            semester
            mentor_talk_confirm
            user {
              realname
              student_no
              department
              class
            }
          }
        }
      `);

      // 查询旧系统数据
      const old_query: any = await client.request(gql`
        query GetAllOldTalkRecords {
          mentor_application(
            where: { chat_status: { _eq: true } }
            order_by: { chat_time: desc }
          ) {
            id
            student_uuid
            chat_time
            chat_confirm
            student {
              realname
              student_no
              department
              class
            }
          }
        }
      `);

      // 转换旧数据格式
      const legacy_records = (old_query.mentor_application ?? []).map(
        (app: any) => ({
          id: app.id,
          updated_at: app.chat_time,
          user_id: app.student_uuid,
          semester: "",
          mentor_talk_confirm: app.chat_confirm ?? false,
          application_id: app.id,
          user: app.student,
        }),
      );

      const all_records = [
        ...legacy_records,
        ...(query.mentor_talk_record ?? []),
      ];

      return res.status(200).json(all_records);
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

// 导师获取自己学生的谈话记录（仅已通过申请的学生）
router.get(
  "/info/mentor/my_students_talk_records",
  authenticate(["teacher"]),
  async (req, res) => {
    try {
      const mentor_uuid: string = req.auth.user.uuid;

      const applications_query: any = await client.request(
        gql`
          query GetApprovedStudentsForTalk($mentor_uuid: uuid!) {
            mentor_application(
              where: {
                mentor_uuid: { _eq: $mentor_uuid }
                status: { _eq: "approved" }
              }
            ) {
              student_uuid
            }
          }
        `,
        { mentor_uuid },
      );

      const approved = applications_query?.mentor_application ?? [];
      if (approved.length === 0) {
        return res.status(200).json([]);
      }

      const student_uuids: string[] = approved.map((a: any) => a.student_uuid);

      // 查询新系统数据（mentor_talk_record 表）
      const records_query: any = await client.request(
        gql`
          query GetStudentsTalkRecords($student_uuids: [uuid!]!) {
            mentor_talk_record(
              where: { user_id: { _in: $student_uuids } }
              order_by: { updated_at: desc }
            ) {
              id
              updated_at
              user_id
              semester
              mentor_talk_confirm
              user {
                realname
                student_no
                department
                class
              }
            }
          }
        `,
        { student_uuids },
      );

      // 查询旧系统数据（mentor_application 表）
      const old_applications_query: any = await client.request(
        gql`
          query GetOldTalkApplications($mentor_uuid: uuid!) {
            mentor_application(
              where: {
                mentor_uuid: { _eq: $mentor_uuid }
                status: { _eq: "approved" }
                chat_status: { _eq: true }
              }
              order_by: { chat_time: desc }
            ) {
              id
              student_uuid
              chat_time
              chat_confirm
              student {
                realname
                student_no
                department
                class
              }
            }
          }
        `,
        { mentor_uuid },
      );

      // 转换旧数据格式
      const legacy_records = (
        old_applications_query.mentor_application ?? []
      ).map((app: any) => ({
        id: app.id,
        updated_at: app.chat_time,
        user_id: app.student_uuid,
        semester: "", // 旧系统标记
        mentor_talk_confirm: app.chat_confirm ?? false,
        application_id: app.id, // 用于下载
        user: app.student,
      }));

      const all_records = [
        ...legacy_records,
        ...(records_query.mentor_talk_record ?? []),
      ];

      return res.status(200).json(all_records);
    } catch (err) {
      console.log(err);
      return res.status(500).send("Internal server error");
    }
  },
);

export default router;
