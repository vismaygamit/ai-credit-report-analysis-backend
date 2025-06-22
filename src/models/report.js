import mongoose from "mongoose";
const CreditReportSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    plan_type: {
      type: String,
      enum: ["basic", "pro"],
      required: true,
    },
    credit_score: [
      {
        type: String,
      },
    ],
    main_concerns: [
      {
        type: String,
      },
    ],
    types_of_accounts: [
      {
        type: String,
      },
    ],
    credit_scores: {
      vantage_score: { type: Number },
      insight_score: { type: Number },
      generic_risk_score: { type: Number },
    },
    income_employment: {
      employer: { type: String },
      income_annual: { type: Number },
      income_trend: {
        type: String,
        enum: ["stable", "increasing", "decreasing"],
      },
      job_title: { type: String },
      years_employed: { type: Number },
    },
    liabilities_summary: {
      revolving: {
        balance: { type: Number },
        credit_limit: { type: Number },
        high_credit: { type: Number },
        scheduled_payment: { type: Number },
      },
      installment: {
        balance: { type: Number },
        credit_limit: { type: Number },
        high_credit: { type: Number },
        scheduled_payment: { type: Number },
      },
      other: {
        balance: { type: Number },
        credit_limit: { type: Number },
        high_credit: { type: Number },
        scheduled_payment: { type: Number },
      },
      mortgage: {
        balance: { type: Number },
        credit_limit: { type: Number },
        high_credit: { type: Number },
        scheduled_payment: { type: Number },
      },
    },
    ratios: {
      dti_ratio: { type: Number },
      revolving_utilization_ratio: { type: Number },
    },
    red_flags: [{ type: String }],
    positive_indicators: [{ type: String }],
    recommendations: {
      for_underwriters: [{ type: String }],
      for_borrower: [{ type: String }],
    },
    final_assessment: {
      credit_risk: { type: String },
      liquidity: { type: String },
      stability: { type: String },
      recommendation: { type: String },
    },
    credit_history_summary: {
      total_accounts: { type: Number },
      revolving_accounts: { type: Number },
      installment_accounts: { type: Number },
      mortgage_accounts: { type: Number },
      other_accounts: { type: Number },
      oldest_account_years: { type: Number },
      avg_account_age_years: { type: Number },
      delinquencies_30: { type: Number },
      delinquencies_60: { type: Number },
      delinquencies_90: { type: Number },
      most_recent_account_date: { type: String },
    },
    inquiries_summary: {
      recent_inquiries: { type: Number },
      sources: [{ type: String }],
    },
    datx_derogatory_info: {
      returned_payments: { type: Number },
      subprime_lenders: [{ type: String }],
      notes: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model("CreditReport", CreditReportSchema);
