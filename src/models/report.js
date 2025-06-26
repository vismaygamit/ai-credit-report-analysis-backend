import mongoose from "mongoose";
const CreditReportSchema = new mongoose.Schema(
  {
    userId: { type: String },
    creditScore: [{ type: String }],
    factorAnalysis: [
      {
        _id: false,
        factor: { type: String },
        status: { type: String },
        details: { type: String }
      }
    ],
    actionPlan: [
      {
        _id: false,
        month: { type: String },
        actions: [{ type: String }]
      }
    ],
    delinquencyStatus: { type: String },
    reportLanguage: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("CreditReport", CreditReportSchema);
