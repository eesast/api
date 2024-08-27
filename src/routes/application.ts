import express from "express";
import { gql } from "graphql-request";
import { client } from "..";

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
        return res.status(200).send({types: types, time: q_honor_time.honor_time_by_pk});
    } catch (err) {
        return res.status(500).send(err);
    }
})

/* 查询当年的新生导师申请时间段
* @return {time: {start_A, end_A, ..., start_E, end_E}}
*/
router.get("/info/mentor", async (req, res) => {
    try {
        const year = new Date().getFullYear();
        const q_mentor_time: any = await client.request(
            gql`
                query MyQuery($activateIn: Int!){
                    mentor_time_by_pk(activateIn: $activateIn) {
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
                activateIn: year
            }
        )
        if (!q_mentor_time?.mentor_time_by_pk) {
            return res.status(500).send("Error: No mentor time found");
        }
        return res.status(200).send({time: q_mentor_time.mentor_time_by_pk});
    } catch (err) {
        return res.status(500).send(err);
    }
})
export default router;
