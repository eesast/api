import mongoose from "mongoose";

export interface ApplicationModel extends mongoose.Document {
    activateIn: number,
    honors: [String],               // 荣誉名称列表
    honor: {                        // 荣誉申请时间节点和公示时间节点
        start_A: Date,
        start_B: Date,
        end_A: Date,
        end_B: Date
    },
    aid: {                          // 助学金申请时间节点和公示时间节点
        start_A: Date,
        start_B: Date,
        end_A: Date,
        end_B: Date
    },
    scholarship: {                  // 奖学金申请时间节点和公示时间节点
        start_A: Date,
        start_B: Date,
        end_A: Date,
        end_B: Date
    }
}

const applicationSchema = new mongoose.Schema<ApplicationModel>(
    {
        activateIn: {
            type: Number
        },
        honors: {
            type: [String]
        },
        honor: {
            type: {
                start_A: Date,
                start_B: Date,
                end_A: Date,
                end_B: Date
            }
        },
        aid: {
            type: {
                start_A: Date,
                start_B: Date,
                end_A: Date,
                end_B: Date
            }
        },
        scholarship: {
            type: {
                start_A: Date,
                start_B: Date,
                end_A: Date,
                end_B: Date
            }
        },
    },
    {
      collection: "application",
    }
  );

export default mongoose.model<ApplicationModel>("Application", applicationSchema);
