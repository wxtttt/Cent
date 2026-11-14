import type { Bill, BillType } from "./type";

/** 标签组可以快捷收纳标签，可以略过
 */
export type BillTagGroup = {
    name: string;
    id: string;
    color: string;
    /** 是否单选，开启后该标签组最多只能选中一个 */
    singleSelect?: boolean;
    /** 是否必选，开启后该标签组必须选择一个（默认选择第一个标签） */
    required?: boolean;
    tagIds?: string[];
};

/**
 * 月度预算记录：普通预算与特殊预算同构，每月各一条或若干条。
 * 周期边界在生成时冻结在记录上，账本级的 budgetStartDay 只用于生成未来记录。
 * 见 docs/adr/0005 与 docs/adr/0006。
 */
export type Budget = {
    id: string;
    kind: "normal" | "special";
    title: string;
    periodStart: number;
    periodEnd: number;
    joiners: (string | number)[];
    totalBudget: number;
    categoriesBudget?: {
        id: string;
        budget: number;
    }[];
    /** 仅特殊预算：关联的特殊标签 */
    tagIds?: string[];
    /** 仅特殊预算：是否参与启动补齐的逐月复制 */
    repeatMonthly?: boolean;
    /** 起始日变更时被动延长／缩短的周期，界面需标注 */
    isTransition?: boolean;
};

/** 账本成员：软停用，不删除，历史账单仍能显示名字 */
export type Member = {
    id: string;
    name: string;
    active: boolean;
};

/**
 * 过滤器，不需要转换，可以略过
 */
export type BillFilter = Partial<{
    comment: string;
    recent?: {
        value: number;
        unit: "year" | "month" | "week" | "day";
    };
    start: number;
    end: number;
    type: BillType | undefined;
    creators: (string | number)[];
    categories: string[];
    minAmountNumber: number;
    maxAmountNumber: number;
    assets?: boolean;
    scheduled?: boolean;
    tags?: string[];
    excludeTags?: string[];
    baseCurrency: string;
    currencies?: string[];
}>;

export type BillFilterViewModule =
    | "base-analysis" // BaseAnalysis 模块，这个模块必须被包含在内
    | "top-words" // AnalysisCloud 高频词云展示模块
    | "map" // AnalysisMap 地图模块
    | "analysis" // AnalysisDetail 简易分析模块
    | "top-expense" // 最高支出模块
    | "top-income" // 最高收入模块
    | `widget-${string}`; // Widget 组件

export type BillFilterView = {
    id: string;
    filter: BillFilter;
    name: string;
    displayCurrency?: string;
    modules?: BillFilterViewModule[];
};

/** 周期记账配置 */
export type Scheduled = {
    id: string;
    title: string;
    start: number;
    end?: number;
    /** 结束次数上限：从 start 起最多生成多少期；与 end 同时存在时取先到者 */
    endCount?: number;
    template: Omit<Bill, "id" | "creatorId">;
    enabled?: boolean;
    repeat: {
        unit: "week" | "day" | "month" | "year";
        value: number;
    };
    // 最新一条自动记账记录的时间
    latest?: number;
};

/** 自动记账规则：备注命中关键词后填充分类，数组顺序即优先级 */
export type AutoRule = {
    id: string;
    enabled: boolean;
    /** 备注包含该关键词（不区分大小写）即命中 */
    keyword: string;
    /** 限定收支方向，不填为不限 */
    type?: BillType;
    /** 命中后设置的分类 */
    categoryId?: string;
};

/** 嵌套内容在保存与请求入口校验为标准 JSON；非递归类型避免 Immer Draft 无限展开。 */
export type JSONObject = Record<string, unknown>;

// AI配置类型
export type AIConfig = {
    id: string;
    name: string;
    apiKey: string; // base64 encoded
    apiUrl: string;
    model: string;
    apiType: "open-ai-compatible" | "google-ai-studio"; // 支持OpenAI兼容和Google AI Studio两种API格式
    /**
     * 单次生成的最大 token 数。推理模型（如 deepseek 系列）思考阶段也会消耗该预算，
     * 设置过小会在思考未完成时就被 finish_reason="length" 截断。不填则使用默认值。
     */
    maxTokens?: number;
    /** 浅合并到 API 请求体顶层；会话、工具和流式协议核心字段由系统保留。 */
    customParams?: JSONObject;
};

// 个人配置，不需要转换，可以略过
export type PersonalMeta = {
    names?: Record<string, string>;
    rates?: Record<string, number>;
    tagGroups?: BillTagGroup[];
    scheduleds?: Scheduled[];
    /** 贷款计算器保存的方案 */
    loanPlans?: SavedLoanPlan[];
    /** 最近导入记录（按时间倒序，最多保留 20 条） */
    importHistory?: ImportHistoryEntry[];
    customCSS?: string;
    homeWidgets?: string[]; // 首页展示的widget列表，元素为widget id
    assistant?: {
        bigmodel?: {
            apiKey?: string;
        };
        configs?: AIConfig[];
        defaultConfigId?: string;
    };
};

export type CustomCurrency = {
    id: string;
    name: string;
    symbol: string;
    rateToBase: number;
};

/** 贷款计算器保存的方案，随个人配置同步 */
export type SavedLoanPlan = {
    id: string;
    name: string;
    /** 贷款本金（元） */
    principal: number;
    /** 年利率（百分数） */
    annualRate: number;
    /** 还款期数（月） */
    months: number;
    createdAt: number;
};

/** 一次账单导入的历史记录 */
export type ImportHistoryEntry = {
    time: number;
    /** 导入来源（如 alipay / wechat / 自定义方案名） */
    source: string;
    count: number;
};
