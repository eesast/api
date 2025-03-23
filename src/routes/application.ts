import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import * as MentHasFunc from "../hasura/mentor";
import * as HnrHasFunc from "../hasura/honor";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

interface IMentor {
    uuid: string;     // 导师uuid
    name: string;     // 导师姓名
    dept: string;     // 导师院系
    mail: string;     // 导师邮箱
    phon?: string;     // 导师电话
    intr?: string;     // 导师简介
    bgnd?: string;     // 导师背景
    flds?: string;     // 导师领域
    achv?: string;     // 导师成就
    avail?: boolean;   // 导师是否可用
    max_apl?: number;  // 导师最大申请人数
    tot_apl?: number;  // 导师总申请人数
    mat_apl?: number;  // 导师已匹配人数
}


interface IStudent {
    uuid: string;     // 学生uuid
    name: string;     // 学生姓名
    stid: string;     // 学生学号
    dept: string;     // 学生院系
    clss: string;     // 学生班级
    mail: string;     // 学生邮箱
    phon: string;     // 学生电话
}

interface IApplication {
    id: string;       // 申请id
    stmt: string;     // 申请陈述
    created: string;  // 申请时间
    year: number;     // 申请年份
    status: string;   // 申请状态
    chat: boolean;    // 申请聊天状态
    men?: IMentor;     // 申请导师
    stu?: IStudent;    // 申请学生
}

interface IFreshman {
    name: string;     // 学生姓名
    stid: string;     // 学生学号
    uuid?: string;     // 学生uuid
}

interface ISchedulePeriod {
    beg: Date;        // 开始时间
    end: Date;        // 结束时间
    roles?: string[];  // 参与角色（显示用）
    prompt?: string;   // 提示信息（显示用）
}
interface ISchedule {
    A: ISchedulePeriod;  // 预备阶段：导师更新个人信息
    B: ISchedulePeriod;  // 预备阶段：学生了解导师信息
    C: ISchedulePeriod;  // 第一阶段：自由申请与匹配
    D: ISchedulePeriod;  // 第二阶段：未匹配同学补选
    E: ISchedulePeriod;  // 第三阶段：系统随机分配
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
                query MyQuery($activateIn: Int!){
                    honor_time_by_pk(activateIn: $activateIn) {
                        start_A
                        end_A
                        start_B
                        end_B
                    }
                }
            `,
            { activateIn: year }
        )
        if (!q_honor_time?.honor_time_by_pk) {
            return res.status(500).send("Error: No honor time found");
        }
        const q_honor_type: any = await client.request(
            gql`
                query MyQuery {
                    honor_type {
                        type_name
                    }
                }
            `
        )
        const types: string[] = q_honor_type.honor_type.map((item: { type_name: string }) => item.type_name);
        return res.status(200).send({ types: types, time: q_honor_time.honor_time_by_pk });
    } catch (err) {
        return res.status(500).send(err);
    }
})

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
        const insert_id = await HnrHasFunc.insert_honor_application(student_uuid, honor, statement, attachment_url, year);
        if (!insert_id) {
            return res.status(452).send("Error: Insert honor application failed");
        }
        return res.status(200).send(insert_id);
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
})

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
        } else if (application.student_uuid !== student_uuid && role !== "counselor") {
            return res.status(452).send("Error: Invalid student_uuid");
        }

        const year: number = new Date().getFullYear();
        if (application.year !== year) {
            return res.status(453).send("Error: Invalid year");
        }

        if (!attachment_url) {
            const response = await HnrHasFunc.update_honor_application(id, honor, statement);
            if (!response) {
                return res.status(454).send("Error: Update honor application failed");
            }
        } else {
            const response = await HnrHasFunc.update_honor_application_with_attachment(id, honor, statement, attachment_url);
            if (!response) {
                return res.status(454).send("Error: Update honor application failed");
            }
        }
        return res.status(200).send(id);
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
})

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
        } else if (application.student_uuid !== student_uuid && role !== "counselor") {
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
})

router.post("/honor/update_status_one", async (req, res) => {
    try {
        const id: string = req.body.id;
        const status: string = req.body.status;
        const counselor_uuid: string = req.body.counselor_uuid;

        if (!id || !status || !counselor_uuid) {
            return res.status(450).send("Error: Missing id or status or counselor_uuid");
        }

        const application = await HnrHasFunc.query_honor_application(id);
        const role = await HnrHasFunc.query_user_role(counselor_uuid);
        if (!application) {
            return res.status(451).send("Error: No honor application found");
        } else if (role !== "counselor") {
            return res.status(452).send("Error: Invalid counselor_uuid");
        }

        const response = await HnrHasFunc.update_honor_application_status(id, status);
        if (!response) {
            return res.status(453).send("Error: Update honor application status failed");
        }
        return res.status(200).send(id);
    } catch (err) {
        return res.status(500).send(err);
    }
});


// 获取导师列表
router.get("/info/mentor/mentor_list", authenticate(["student", "teacher", "counselor"]), async (req, res) => {
    const mentor_query: any = await client.request(
        gql`
        query MyQuery {
            mentor_info(order_by: { available: desc, max_applicants: desc }) {
                achievement
                available
                background
                field
                intro
                max_applicants
                mentor_uuid
                user {
                    department
                    email
                    realname
                }
            }
        }
        `
    );

    const mentors: IMentor[] = await Promise.all(
        mentor_query.mentor_info.map(async (mentor_info: any) => {
            const total_application_aggregate: any = await client.request(
                gql`
                query MyQuery($mentor_uuid: uuid!, $year: Int!) {
                    mentor_application_aggregate(
                        where: {
                            _and: {
                                mentor_uuid: {_eq: $mentor_uuid},
                                year: {_eq: $year}
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
                    year: (new Date()).getFullYear()
                }
            );
            const matched_application_aggregate: any = await client.request(
                gql`
                query MyQuery($mentor_uuid: uuid!, $year: Int!, $status: String!) {
                    mentor_application_aggregate(
                        where: {
                            _and: {
                                mentor_uuid: {_eq: $mentor_uuid},
                                _and: {
                                    year: {_eq: $year},
                                    status: {_eq: $status}
                                }
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
                    year: (new Date()).getFullYear(),
                    status: "approved"
                }
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
                max_apl: mentor_info.max_applicants,
                tot_apl: total_application_aggregate.mentor_application_aggregate.aggregate.count,
                mat_apl: matched_application_aggregate.mentor_application_aggregate.aggregate.count
            }
            return mentor;
        })
    );
    return res.status(200).send(mentors);
});

// 获取时间表，自动创建新年份的时间表
router.get("/info/mentor/schedule", authenticate(["student", "teacher", "counselor"]), async (req, res) => {
    try {
        const add_schedule_mutation: any = await client.request(
            gql`
            mutation MyMutation($activateIn: Int!) {
                insert_mentor_time_one(
                    object: {activateIn: $activateIn},
                    on_conflict: {
                        constraint: mentor_time_pkey,
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
                activateIn: (new Date()).getFullYear()
            }
        );
        if (!add_schedule_mutation.insert_mentor_time_one) {
            console.log(add_schedule_mutation, (new Date()).getFullYear());
            return res.status(500).send("Error: Failed to get schedule");
        }
        const schedule: ISchedule = {
            A: {
                beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_A),
                end: new Date(add_schedule_mutation.insert_mentor_time_one.end_A),
                roles: ["teacher", "counselor"],
                prompt: "预备阶段：导师更新个人信息"
            } as ISchedulePeriod,
            B: {
                beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_B),
                end: new Date(add_schedule_mutation.insert_mentor_time_one.end_B),
                roles: ["student", "counselor"],
                prompt: "预备阶段：学生了解导师信息"
            } as ISchedulePeriod,
            C: {
                beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_C),
                end: new Date(add_schedule_mutation.insert_mentor_time_one.end_C),
                roles: ["student", "teacher", "counselor"],
                prompt: "第一阶段：自由申请与匹配"
            } as ISchedulePeriod,
            D: {
                beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_D),
                end: new Date(add_schedule_mutation.insert_mentor_time_one.end_D),
                roles: ["student", "teacher", "counselor"],
                prompt: "第二阶段：未匹配同学补选"
            } as ISchedulePeriod,
            E: {
                beg: new Date(add_schedule_mutation.insert_mentor_time_one.start_E),
                end: new Date(add_schedule_mutation.insert_mentor_time_one.end_E),
                roles: ["student", "teacher", "counselor"],
                prompt: "第三阶段：系统随机分配"
            } as ISchedulePeriod
        }
        return res.status(200).send(schedule);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 获取申请信息，根据身份返回导师被申请的/学生申请的/所有的
router.get("/info/mentor/applications", authenticate(["student", "teacher", "counselor"]), async (req, res) => {
    try {
        const user_uuid: string = req.auth.user.uuid;
        const role: string = req.auth.user.role;

        if (role === "student") {
            const application_query: any = await client.request(
                gql`
                query MyQuery($student_uuid: uuid!, $year: Int!) {
                    mentor_application(
                        where: {
                            _and: {
                                student_uuid: {_eq: $student_uuid},
                                year: {_eq: $year}
                            }
                        }
                    ) {
                        chat_status
                        created_at
                        id
                        mentor_uuid
                        statement
                        status
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
                    year: (new Date()).getFullYear()
                }
            );
            const applications: IApplication[] = application_query.mentor_application.map((app: any) => {
                const mentor: IMentor = {
                    uuid: app.mentor_uuid,
                    name: app.mentor.realname,
                    dept: app.mentor.department,
                    mail: app.mentor.email,
                }
                const application: IApplication = {
                    id: app.id,
                    stmt: app.statement,
                    created: app.created_at,
                    year: app.year,
                    status: app.status,
                    chat: app.chat_status,
                    men: mentor
                }
                return application;
            });
            return res.status(200).send(applications);

        } else if (role === "teacher") {
            const applications_query: any = await client.request(
                gql`
                query MyQuery($mentor_uuid: uuid!, $year: Int!) {
                    mentor_application(
                        where: {
                            _and: {
                                mentor_uuid: {_eq: $mentor_uuid},
                                year: {_eq: $year}
                            }
                        }
                    ) {
                        chat_status
                        created_at
                        id
                        statement
                        status
                        student_uuid
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
                    year: (new Date()).getFullYear()
                }
            );
            const applications: IApplication[] = applications_query.mentor_application.map((app: any) => {
                const student: IStudent = {
                    uuid: app.student_uuid,
                    name: app.student.realname,
                    stid: app.student.student_no,
                    dept: app.student.department,
                    clss: app.student.class,
                    mail: app.student.email,
                    phon: app.student.phone
                }
                const application: IApplication = {
                    id: app.id,
                    stmt: app.statement,
                    created: app.created_at,
                    year: app.year,
                    status: app.status,
                    chat: app.chat_status,
                    stu: student
                }
                return application;
            });
            return res.status(200).send(applications);
        } else if (role === "counselor") {
            const applications_query: any = await client.request(
                gql`
                query MyQuery($year: Int!) {
                    mentor_application(where: {year: {_eq: $year}}) {
                        chat_status
                        created_at
                        id
                        mentor_uuid
                        statement
                        status
                        student_uuid
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
                `,
                {
                    year: (new Date()).getFullYear()
                }
            );
            const applications: IApplication[] = applications_query.mentor_application.map((app: any) => {
                const mentor: IMentor = {
                    uuid: app.mentor_uuid,
                    name: app.mentor.realname,
                    dept: app.mentor.department,
                    mail: app.mentor.email,
                    phon: app.mentor.phone
                }
                const student: IStudent = {
                    uuid: app.student_uuid,
                    name: app.student.realname,
                    stid: app.student.student_no,
                    dept: app.student.department,
                    clss: app.student.class,
                    mail: app.student.email,
                    phon: app.student.phone
                }
                const application: IApplication = {
                    id: app.id,
                    stmt: app.statement,
                    created: app.created_at,
                    year: app.year,
                    status: app.status,
                    chat: app.chat_status,
                    men: mentor,
                    stu: student
                }
                return application;
            });
            return res.status(200).send(applications);
        } else {
            return res.status(400).send("Error: Unauthorized");
        }
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 导师获取自身信息，自动成为新生导师
router.get("/info/mentor/mentor", authenticate(["teacher"]), async (req, res) => {
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
                mentor_uuid: user_uuid
            }
        );

        if (mentor_query.mentor_info_by_pk) {
            const application_query: any = await client.request(
                gql`
                query MyQuery($mentor_uuid: uuid!, $year: Int!) {
                    mentor_application(
                        where: {
                            _and: {
                                mentor_uuid: {_eq: $mentor_uuid},
                                year: {_eq: $year}
                            }
                        }
                    ) {
                    status
                    }
                }
                `,
                {
                    mentor_uuid: user_uuid,
                    year: (new Date()).getFullYear()
                }
            );
            const mentor_info: any = mentor_query.mentor_info_by_pk;
            const total_applications: number = application_query.mentor_application.length;
            const matched_applications: number = application_query.mentor_application.filter((application: any) => application.status === "approved").length;
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
                max_apl: mentor_info.max_applicants,
                tot_apl: total_applications,
                mat_apl: matched_applications
            }
            return res.status(200).send(mentor);
        } else {
            const add_mentor_mutation: any = await client.request(
                gql`
                mutation MyMutation($mentor_uuid: uuid!, $max_applicants: Int!, $available: Boolean!) {
                    insert_mentor_info_one(
                        object: {
                            mentor_uuid: $mentor_uuid,
                            max_applicants: $max_applicants,
                            available: $available
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
                    available: false
                }
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
                max_apl: 5,
                tot_apl: 0,
                mat_apl: 0
            }
            return res.status(200).send(mentor);
        }
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 获取新生信息
router.get("/info/mentor/freshmen", authenticate(["student", "counselor"]), async (req, res) => {
    try {
        const role: string = req.auth.user.role;
        const user_uuid: string = req.auth.user.uuid;

        if (role === "student") {
            const student_no: string = req.auth.user.student_no;
            const realname: string = req.auth.user.realname;
            const freshman_query: any = await client.request(
                gql`
                query MyQuery($year: Int!, $realname: String!, $student_no: String!) {
                    freshman(
                        where: {
                            _and: {
                                year: {_eq: $year},
                                _and: {
                                    realname: {_eq: $realname},
                                    student_no: {_eq: $student_no}
                                }
                            }
                        }
                    ) {
                        uuid
                    }
                }
                `,
                {
                    year: (new Date()).getFullYear(),
                    realname: realname,
                    student_no: student_no
                }
            );
            if (freshman_query.freshman.length === 0) {
                return res.status(200).send([] as IFreshman[]);
            }
            const freshman: IFreshman = {
                name: realname,
                stid: student_no,
                uuid: user_uuid
            }
            return res.status(200).send([freshman]);

        } else if (role === "counselor") {
            const freshman_query: any = await client.request(
                gql`
                query MyQuery($year: Int!) {
                    freshman(where: {year: {_eq: $year}}) {
                        realname
                        student_no
                        uuid
                    }
                }
                `,
                {
                    year: (new Date()).getFullYear()
                }
            );
            const freshmen: IFreshman[] = await Promise.all(
                freshman_query.freshman.map(async (freshman: any) => {
                    const user_query: any = await client.request(
                        gql`
                        query MyQuery($student_no: String!, $realname: String!) {
                            users(
                                where: {
                                    _and: {
                                        student_no: {_eq: $student_no},
                                        realname: {_eq: $realname}
                                    }
                                }
                            ) {
                                uuid
                            }
                        }
                        `,
                        {
                            student_no: freshman.student_no,
                            realname: freshman.realname
                        }
                    );
                    const student: IFreshman = {
                        name: freshman.realname,
                        stid: freshman.student_no,
                        uuid: user_query.users.length > 0 ? user_query.users[0].uuid : undefined
                    }
                    return student;
                })
            );
            return res.status(200).send(freshmen);
        } else {
            return res.status(400).send("Error: Unauthorized");
        }
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新时间表
router.post("/info/mentor/schedule", authenticate(["counselor"]), async (req, res) => {
    try {
        const schedule: ISchedule = req.body.schedule;
        const update_schedule_mutation: any = await client.request(
            gql`
            mutation MyMutation($activateIn: Int!, $start_A: timestamptz!, $end_A: timestamptz!, $start_B: timestamptz!, $end_B: timestamptz!, $start_C: timestamptz!, $end_C: timestamptz!, $start_D: timestamptz!, $end_D: timestamptz!, $start_E: timestamptz!, $end_E: timestamptz!) {
                update_mentor_time_by_pk(
                    pk_columns: {activateIn: $activateIn},
                    _set: {start_A: $start_A, end_A: $end_A, start_B: $start_B, end_B: $end_B, start_C: $start_C, end_C: $end_C, start_D: $start_D, end_D: $end_D, start_E: $start_E, end_E: $end_E}
                ) {
                    activateIn
                }
            }
            `,
            {
                activateIn: (new Date()).getFullYear(),
                start_A: schedule.A.beg,
                end_A: schedule.A.end,
                start_B: schedule.B.beg,
                end_B: schedule.B.end,
                start_C: schedule.C.beg,
                end_C: schedule.C.end,
                start_D: schedule.D.beg,
                end_D: schedule.D.end,
                start_E: schedule.E.beg,
                end_E: schedule.E.end
            }
        );

        if (!update_schedule_mutation.update_mentor_time_by_pk) {
            return res.status(500).send("Error: Update schedule failed");
        }
        return res.status(200).send(update_schedule_mutation.update_mentor_time_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新导师可申请状态
router.post("/info/mentor/avail", authenticate(["teacher"]), async (req, res) => {
    try {
        const available: boolean = req.body.available;
        const update_avail_mutation: any = await client.request(
            gql`
            mutation MyMutation($mentor_uuid: uuid!, $available: Boolean!) {
                update_mentor_info_by_pk(
                    pk_columns: {mentor_uuid: $mentor_uuid},
                    _set: {available: $available}
                ) {
                    available
                }
            }
            `,
            {
                mentor_uuid: req.auth.user.uuid,
                available: available
            }
        );
        if (!update_avail_mutation.update_mentor_info_by_pk) {
            return res.status(500).send("Error: Update available failed");
        }
        return res.status(200).send(update_avail_mutation.update_mentor_info_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新导师可申请数量
router.post("/info/mentor/max_app", authenticate(["teacher"]), async (req, res) => {
    try {
        const max_applicants: number = req.body.max_applicants;
        if (max_applicants < 1 || max_applicants > 5) {
            return res.status(400).send("Error: Invalid max_applicants");
        }
        const update_max_app_mutation: any = await client.request(
            gql`
            mutation MyMutation($mentor_uuid: uuid!, $max_applicants: Int!) {
                update_mentor_info_by_pk(
                    pk_columns: {mentor_uuid: $mentor_uuid},
                    _set: {max_applicants: $max_applicants}
                ) {
                    max_applicants
                }
            }
            `,
            {
                mentor_uuid: req.auth.user.uuid,
                max_applicants: max_applicants
            }
        );
        if (!update_max_app_mutation.update_mentor_info_by_pk) {
            return res.status(500).send("Error: Update max_applicants failed");
        }
        return res.status(200).send(update_max_app_mutation.update_mentor_info_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新导师介绍
router.post("/info/mentor/intro", authenticate(["teacher"]), async (req, res) => {
    try {
        const achv: string = req.body.achv;
        const bgnd: string = req.body.bgnd;
        const flds: string = req.body.flds;
        const intr: string = req.body.intr;
        if (achv.length == 0 || bgnd.length == 0 || flds.length == 0 || intr.length == 0) {
            return res.status(400).send("Error: Invalid intro");
        }

        const update_intro_mutation: any = await client.request(
            gql`
            mutation MyMutation($mentor_uuid: uuid!, $achievement: String!, $background: String!, $field: String!, $intro: String!) {
                update_mentor_info_by_pk(
                    pk_columns: {mentor_uuid: $mentor_uuid},
                    _set: {achievement: $achievement, background: $background, field: $field, intro: $intro}
                ) {
                    achievement
                    background
                    field
                    intro
                }
            }
            `,
            {
                mentor_uuid: req.auth.user.uuid,
                achievement: achv,
                background: bgnd,
                field: flds,
                intro: intr
            }
        );
        if (!update_intro_mutation.update_mentor_info_by_pk) {
            return res.status(500).send("Error: Update intro failed");
        }
        return res.status(200).send(update_intro_mutation.update_mentor_info_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新申请状态
router.post("/info/mentor/status", authenticate(["teacher"]), async (req, res) => {
    try {
        const id: string = req.body.id;  // 申请id
        const status: string = req.body.status;  // 申请状态
        const user_uuid: string = req.auth.user.uuid;  // 用户uuid

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
                activateIn: (new Date()).getFullYear()
            }
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
                }
            }
            `,
            {
                id: id
            }
        );

        if (!application_query.mentor_application_by_pk) {
            return res.status(400).send("Error: Application not found");
        }
        if (user_uuid !== application_query.mentor_application_by_pk.mentor_uuid) {
            return res.status(400).send("Error: Unauthorized");
        }
        if ((new Date()).getFullYear() !== application_query.mentor_application_by_pk.year) {
            return res.status(400).send("Error: Invalid year");
        }

        const update_status_mutation: any = await client.request(
            gql`
            mutation MyMutation($id: uuid!, $status: String!) {
                update_mentor_application_by_pk(
                    pk_columns: {id: $id},
                    _set: {status: $status}
                ) {
                    status
                }
                }
            `,
            {
                id: id,
                status: status
            }
        );

        if (!update_status_mutation.update_mentor_application_by_pk) {
            return res.status(500).send("Error: Update status failed");
        }

        return res.status(200).send(update_status_mutation.update_mentor_application_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新申请陈述
router.post("/info/mentor/application", authenticate(["student"]), async (req, res) => {
    try {
        const id: string = req.body.id;
        const statement: string = req.body.statement;
        const user_uuid: string = req.auth.user.uuid;

        if (statement.length == 0) {
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
                activateIn: (new Date()).getFullYear()
            }
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
                id: id
            }
        );

        if (!application_query.mentor_application_by_pk) {
            return res.status(400).send("Error: Application not found");
        }
        if (user_uuid !== application_query.mentor_application_by_pk.student_uuid) {
            return res.status(400).send("Error: Unauthorized");
        }
        if (application_query.mentor_application_by_pk.status === "approved") {
            return res.status(400).send("Error: Application approved");
        }
        if ((new Date()).getFullYear() !== application_query.mentor_application_by_pk.year) {
            return res.status(400).send("Error: Invalid year");
        }

        const update_application_mutation: any = await client.request(
            gql`
            mutation MyMutation($id: uuid!, $statement: String!) {
                update_mentor_application_by_pk(
                    pk_columns: {id: $id},
                    _set: {statement: $statement}
                ) {
                    statement
                }
            }
            `,
            {
                id: id,
                statement: statement
            }
        );

        if (!update_application_mutation.update_mentor_application_by_pk) {
            return res.status(500).send("Error: Update application failed");
        }

        return res.status(200).send(update_application_mutation.update_mentor_application_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 更新谈话状态
router.post("/info/mentor/chat", authenticate(["student"]), async (req, res) => {
    try {
        const id: string = req.body.id;
        const user_uuid: string = req.auth.user.uuid;

        const application_query: any = await client.request(
            gql`
            query MyQuery($id: uuid!) {
                mentor_application_by_pk(id: $id) {
                    student_uuid
                }
            }
            `,
            {
                id: id
            }
        );

        if (!application_query.mentor_application_by_pk) {
            return res.status(400).send("Error: Application not found");
        }
        if (user_uuid !== application_query.mentor_application_by_pk.student_uuid) {
            return res.status(400).send("Error: Unauthorized");
        }

        const update_application_mutation: any = await client.request(
            gql`
            mutation MyMutation($id: uuid!, $chat_status: Boolean!) {
                update_mentor_application_by_pk(
                    pk_columns: {id: $id},
                    _set: {chat_status: $chat_status}
                ) {
                    chat_status
                }
            }
            `,
            {
                id: id,
                chat_status: true
            }
        );

        if (!update_application_mutation.update_mentor_application_by_pk) {
            return res.status(500).send("Error: Update chat_status failed");
        }
        return res.status(200).send(update_application_mutation.update_mentor_application_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 新增导师介绍
router.put("/info/mentor/intro", authenticate(["counselor"]), async (req, res) => {
    try {
        const name: string = req.body.name;
        const intr: string = req.body.intr;
        const bgnd: string = req.body.bgnd;
        const flds: string = req.body.flds;
        const achv: string = req.body.achv;

        const user_query: any = await client.request(
            gql`
            query MyQuery($realname: String!) {
                users(where: {realname: {_eq: $realname}}) {
                    uuid
                }
            }
            `,
            {
                realname: name
            }
        );
        if (user_query.users.length === 0) {
            return res.status(400).send("Error: User not found");
        }
        const mentor_uuid: string = user_query.users[0].uuid;

        const add_mentor_mutation: any = await client.request(
            gql`
            mutation MyMutation($achievement: String!, $background: String!, $field: String!, $intro: String!, $mentor_uuid: uuid!) {
                insert_mentor_info_one(
                    object: {
                        achievement: $achievement,
                        background: $background,
                        field: $field,
                        intro: $intro,
                        mentor_uuid: $mentor_uuid
                    },
                    on_conflict: {
                        constraint: mentor_info_pkey,
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
                mentor_uuid: mentor_uuid
            }
        );

        if (!add_mentor_mutation.insert_mentor_info_one) {
            return res.status(500).send("Error: Add mentor failed");
        }
        return res.status(200).send(add_mentor_mutation.insert_mentor_info_one);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 新增申请
router.put("/info/mentor/application", authenticate(["student"]), async (req, res) => {
    try {
        const mentor_uuid: string = req.body.mentor_uuid;
        const statement: string = req.body.statement;
        const user_uuid: string = req.auth.user.uuid;

        if (statement.length == 0) {
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
                activateIn: (new Date()).getFullYear()
            }
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
            query MyQuery($uuid: uuid!, $year: Int!) {
                freshman(
                    where: {
                        _and: {
                            uuid: {_eq: $uuid},
                            year: {_eq: $year}
                        }
                    }
                ) {
                    uuid
                }
            }
            `,
            {
                uuid: user_uuid,
                year: (new Date()).getFullYear()
            }

        );
        if (!freshman_query.freshman) {
            return res.status(400).send("Error: Freshman not found");
        }

        const mentor_info_query: any = await client.request(
            gql`
            query MyQuery($mentor_uuid: uuid!) {
                mentor_info_by_pk(mentor_uuid: $mentor_uuid) {
                    max_applicants
                }
            }
            `,
            {
                mentor_uuid: mentor_uuid
            }
        );
        if (!mentor_info_query.mentor_info_by_pk) {
            return res.status(400).send("Error: Mentor not found");
        }

        const total_application_aggregate: any = await client.request(
            gql`
            query MyQuery($mentor_uuid: uuid!, $year: Int!) {
                mentor_application_aggregate(
                    where: {
                        _and: {
                            mentor_uuid: {_eq: $mentor_uuid},
                            year: {_eq: $year}
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
                year: (new Date()).getFullYear()
            }
        );

        if (total_application_aggregate.mentor_application_aggregate.aggregate.count >= mentor_info_query.mentor_info_by_pk.max_applicants) {
            return res.status(400).send("Error: Exceeds max_applicants");
        }

        const add_application_mutation: any = await client.request(
            gql`
            mutation MyMutation($mentor_uuid: uuid!, $student_uuid: uuid!, $statement: String!, $year: Int!) {
                insert_mentor_application_one(
                    object: {
                        mentor_uuid: $mentor_uuid,
                        student_uuid: $student_uuid,
                        statement: $statement,
                        year: $year
                    },
                    on_conflict: {
                        update_columns: statement,
                        constraint: mentor_application_pkey1
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
                year: (new Date()).getFullYear()
            }
        );

        if (!add_application_mutation.insert_mentor_application_one) {
            return res.status(500).send("Error: Add application failed");
        }
        return res.status(200).send(add_application_mutation.insert_mentor_application_one);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 新增新生
router.put("/info/mentor/freshman", authenticate(["counselor"]), async (req, res) => {
    try {
        const name: string = req.body.name;
        const stid: string = req.body.stid;

        const add_freshman_mutation: any = await client.request(
            gql`
            mutation MyMutation($realname: String!, $student_no: String!, $year: Int!) {
                insert_freshman_one(
                    object: {
                        realname: $realname,
                        student_no: $student_no,
                        year: $year
                    }
                ) {
                    uuid
                }
            }
            `,
            {
                realname: name,
                student_no: stid,
                year: (new Date()).getFullYear()
            }
        );

        if (!add_freshman_mutation.insert_freshman_one) {
            return res.status(500).send("Error: Add freshman failed");
        }
        return res.status(200).send(add_freshman_mutation.insert_freshman_one);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

// 删除申请
router.post("/info/mentor/delete", authenticate(["student"]), async (req, res) => {
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
                activateIn: (new Date()).getFullYear()
            }
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
                id: id
            }
        );

        if (!application_query.mentor_application_by_pk) {
            return res.status(400).send("Error: Application not found");
        }
        if (user_uuid !== application_query.mentor_application_by_pk.student_uuid) {
            return res.status(400).send("Error: Unauthorized");
        }
        if (application_query.mentor_application_by_pk.status === "approved") {
            return res.status(400).send("Error: Application has been approved");
        }
        if ((new Date()).getFullYear() !== application_query.mentor_application_by_pk.year) {
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
                id: id
            }
        );
        if (!delete_application_mutation.delete_mentor_application_by_pk) {
            return res.status(500).send("Error: Delete application failed");
        }
        return res.status(200).send(delete_application_mutation.delete_mentor_application_by_pk);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

export default router;
