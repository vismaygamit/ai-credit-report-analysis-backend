import mongoose from "mongoose";
const CreditReportSchema = new mongoose.Schema(
  {
    userId: { type: String },
    summary: {
      score: Number,
      rating: String,
      tradelines: {
        revolving: [{ type: mongoose.Schema.Types.Mixed }],
        installment: [{ type: mongoose.Schema.Types.Mixed }],
        open: [{ type: mongoose.Schema.Types.Mixed }],
        mortgage: [{ type: mongoose.Schema.Types.Mixed }],
      },
      paymentHistory: {
        allCurrent: Boolean,
        missedOrLatePast24Months: Number,
      },
      inquiries: {
        total: String,
        hard: [{ type: mongoose.Schema.Types.Mixed }],
        soft: [{ type: mongoose.Schema.Types.Mixed }],
      },
      collections: Number,
      judgments: Number,
      creditUtilization: {
        totalLimit: Number,
        totalBalance: Number,
        utilizationRate: Number,
        rating: String,
      },
      creditAge: {
        oldest: { type: mongoose.Schema.Types.Mixed },
        newest: { type: mongoose.Schema.Types.Mixed },
        averageAgeYears: Number,
      },
    },
    accountsAndBalances: [
      {
        _id: false,
        type: { type: String },
        lender: { type: String },
        openDate: { type: String },
        limit: { type: Number },
        balance: { type: Number },
        status: { type: String },
        closed: { type: Boolean },
        pastDue: { type: Number },
      },
    ],
    inquiries: [
      {
        _id: false,
        date: {
          type: String,
        },
        lender: {
          type: String,
        },
        type: {
          type: String,
        },
        affectsScore: {
          type: Boolean,
        },
      },
    ],
    publicRecords: {
      collections: { type: Number },
      judgments: { type: Number },
    },
    securedLoan: {
      lender: { type: String },
      registered: { type: String },
      amount: { type: Number, min: 0 },
      maturity: { type: String },
    },
    creditEvaluation: {
      utilization: { type: String },
      creditMix: { type: String },
      paymentHistory: { type: String },
      delinquency: { type: String },
      inquiryFrequency: { type: String },
      derogatoryMarks: { type: String },
      fileDepth: { type: String },
    },
    scoreForecast: [
      {
        _id: false,
        action: { type: String },
        estimatedImpact: { type: String },
        timeline: { type: String },
        priority: { type: String },
        confidence: { type: String },
      },
    ],
    actionPlan: [
      {
        _id: false,
        recommendation: { type: String },
        description: { type: String },
        priority: { type: String },
        timeline: { type: String },
      },
    ],
    disputeToolkit: {
      disputeLetter: { type: String },
      goodwillScript: { type: String },
    },
    scoreProgress: {
      creditSummary: {
        asOf: { type: String },
        score: { type: Number },
        utilization: { type: String },
        onTimePayments: { type: String },
        activeAccounts: { type: Number },
        hardInquiries: { type: Number },
        softInquiries: { type: String },
        derogatoryMarks: { type: Number },
      },
      scoreSimulator: [{ type: mongoose.Schema.Types.Mixed }],
      target: { type: String },
      checklist: {
        payCTB1: { type: Boolean },
        keepCIBCOpen: { type: Boolean },
        requestCLI: { type: Boolean },
        reportRent: { type: Boolean },
        avoidApplications: { type: Boolean },
      },
      forecastChart: {
        dataPoints: [{ type: mongoose.Schema.Types.Mixed }],
        targetScore: { type: Number },
        targetDate: { type: String },
      },
    },
    reminders: [
      {
        _id: false,
        event: { type: String },
        reminderDate: { type: String },
        action: { type: String },
      },
    ],
  },
  { timestamps: true }
);
export default mongoose.model("CreditReport", CreditReportSchema);
