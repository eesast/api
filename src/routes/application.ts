import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import * as MentHasFunc from "../hasura/mentor";
import * as HnrHasFunc from "../hasura/honor";
import authenticate from "../middlewares/authenticate";
const router = express.Router();
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
})



router.get("/info/mentor/:year", async (req, res) => {
    try {
        const year: number = parseInt(req.params.year, 10);
        if (isNaN(year)) {
            return res.status(450).send("Error: Invalid year provided");
        }
        const mentor_info = await MentHasFunc.get_mentor_info_list();
        if (!mentor_info) {
            return res.status(451).send("Error: No mentor info found");
        }
        const info = await Promise.all(
            mentor_info.map(async (mentor: any) => {
                const applicationsCount = await MentHasFunc.get_mentor_applications_count(mentor.mentor_uuid, year);
                const applicationsApprovedCount = await MentHasFunc.get_mentor_applications_approved_count(mentor.mentor_uuid, year);
                return {
                    ...mentor,
                    total_applicants: applicationsCount,
                    matched_applicants: applicationsApprovedCount
                }
            }
            ));
        return res.status(200).send(info);
    } catch (err) {
        return res.status(500).send(err);
    }
})


router.post("/mentor/insert_one", authenticate(["student"]), async (req, res) => {
    const mentor_uuid: string = req.body.mentor_uuid;
    const student_uuid: string = req.body.student_uuid;
    if (!mentor_uuid || !student_uuid) {
        return res.status(456).send("Error: Invalid parameters provided");
    }
    const year: number = parseInt(req.body.year, 10);
    if (isNaN(year)) {
        return res.status(451).send("Error: Invalid year provided");
    }
    const statement: string = req.body.statement ?? "";

    const mentor_info = await MentHasFunc.get_mentor_info(mentor_uuid);
    if (!mentor_info) {
        return res.status(452).send("Error: No mentor info found");
    }
    const mentor_applications_count = await MentHasFunc.get_mentor_applications_count(mentor_uuid, year);
    if (mentor_applications_count >= mentor_info.max_applicants) {
        return res.status(453).send("Error: Exceeds max_applicants");
    }
    const insert_id = await MentHasFunc.insert_mentor_application(mentor_uuid, student_uuid, year, statement);
    if (!insert_id) {
        return res.status(454).send("Error: Insert mentor application failed");
    }
    return res.status(200).send(insert_id);
})

// /* 查询当年的新生导师申请时间段
// * @return {time: {start_A, end_A, ..., start_E, end_E}}
// */
// router.get("/info/mentor", async (req, res) => {
//     try {
//         const year = new Date().getFullYear();
//         const q_mentor_time: any = await client.request(
//             gql`
//                 query MyQuery($activateIn: Int!){
//                     mentor_time_by_pk(activateIn: $activateIn) {
//                         start_A
//                         end_A
//                         start_B
//                         end_B
//                         start_C
//                         end_C
//                         start_D
//                         end_D
//                         start_E
//                         end_E
//                     }
//                 }
//             `,
//             {
//                 activateIn: year
//             }
//         )
//         if (!q_mentor_time?.mentor_time_by_pk) {
//             return res.status(500).send("Error: No mentor time found");
//         }
//         return res.status(200).send({time: q_mentor_time.mentor_time_by_pk});
//     } catch (err) {
//         return res.status(500).send(err);
//     }
// })


router.post("/mentor/update/status",authenticate(["counselor"]), async (req, res) => {
    try {
        const id : string = req.body.applyid;
        const status : string = req.body.status;
        if(!id || !status){
            return res.status(456).send("Error: Invalid parameters provided");
        }
        const application_status = await MentHasFunc.update_mentor_application_status(id, status);
        if(!application_status){
            return res.status(455).send("Error: Application does not exist");
        }
        return res.status(200).send(application_status);
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});
router.post("/mentor/update/statement",authenticate(["student"]), async (req, res) => {
    try {
        const id : string = req.body.applyid;
        const statement : string = req.body.statement;
        if(!id || !statement){
            return res.status(456).send("Error: Invalid parameters provided");
        }
        const application_statement = await MentHasFunc.update_mentor_application_statement(id, statement);
        if(!application_statement){
            return res.status(455).send("Error: Application does not exist");
        }
        return res.status(200).send(application_statement);
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});
router.post("/mentor/update/delete",authenticate(["student"]), async (req, res) => {
    try {
        const id : string= req.body.applyid;
        if(!id){
            return res.status(456).send("Error: Invalid parameters provided");
        }
        const application_id = await MentHasFunc.delete_mentor_application(id);
        if(!application_id){
            return res.status(455).send("Error: Application does not exist");
        }
        return res.status(200).send(application_id);
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});
//ID here is the application ID
router.post("/chat/update/status",authenticate(["counselor","teacher"]), async (req, res) => {
    try {
        const id : string = req.body.applyid;
        const status : boolean = req.body.chat_status;
        if(!id || status === undefined || status === null){
            return res.status(456).send("Error: Invalid parameters provided");
        }
        const chat_status = await MentHasFunc.update_mentor_application_chat_status(id, status);
        if(chat_status === null || chat_status === undefined){
            return res.status(455).send("Error: Application does not exist");
        }
        if(chat_status === true){
            return res.status(200).json({chat_status: true});
        }
        else{
            return res.status(200).json({chat_status: false});
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send("Internal Server Error");
    }
});
//timestamp should be ISO 8601 format
router.post("/mentor/update/schedule",authenticate(["counselor","root"]), async (req, res) => {
    try {
        const year : number = req.body.year;
        const start_A_string : string = req.body.start_A;
        const start_B_string : string = req.body.start_B;
        const start_C_string : string = req.body.start_C;
        const start_D_string : string = req.body.start_D;
        const start_E_string : string = req.body.start_E;
        const end_A_string : string = req.body.end_A;
        const end_B_string : string = req.body.end_B;
        const end_C_string : string = req.body.end_C;
        const end_D_string : string = req.body.end_D;
        const end_E_string : string = req.body.end_E;
        if(!year || !start_A_string || !start_B_string || !start_C_string || !start_D_string || !start_E_string || !end_A_string || !end_B_string || !end_C_string || !end_D_string || !end_E_string){
            return res.status(456).send("Error: Invalid parameters provided");
        }
        const start_A = new Date(start_A_string);
        const start_B = new Date(start_B_string);
        const start_C = new Date(start_C_string);
        const start_D = new Date(start_D_string);
        const start_E = new Date(start_E_string);
        const end_A = new Date(end_A_string);
        const end_B = new Date(end_B_string);
        const end_C = new Date(end_C_string);
        const end_D = new Date(end_D_string);
        const end_E = new Date(end_E_string);
        const activateIn : number= await MentHasFunc.insert_mentor_application_schedule(year, start_A, start_B, start_C, start_D, start_E, end_A, end_B, end_C, end_D, end_E);
        if(!activateIn){
            throw new Error();
        }
        return res.status(200).send(activateIn.toString());
    } catch (err) {
        console.log(err)
        return res.status(500).send("Internal Server Error");
    }
});
router.post("/freshman/update/info_list",authenticate(["counselor","root"]), async (req, res) => {
    try {
        const info_list = req.body.info_list;
        if(!info_list){
            return res.status(456).send("Error: Invalid parameters provided");
        }
        const freshman_list = Array<MentHasFunc.Freshman_Insert_Input>();
        for(let i = 0; i < info_list.length; i++){
            freshman_list.push({
                uuid: info_list[i].uuid,
                realname: info_list[i].realname,
                student_no: info_list[i].student_no,
                year: info_list[i].year
            });
        }
        console.log(freshman_list[0])
        const affected_rows:number = await MentHasFunc.insert_freshman_info_list(info_list);
        if(!affected_rows){
            throw new Error();
        }
        return res.status(200).send(affected_rows.toString());
    } catch (err) {
        console.log(err)
        return res.status(500).send("Internal Server Error");
    }
});
export default router;
