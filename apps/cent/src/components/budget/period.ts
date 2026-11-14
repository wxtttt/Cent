import dayjs, { type Dayjs } from "dayjs";

export const DEFAULT_START_DAY = 1;

export const clampStartDay = (day: number) =>
    Math.min(31, Math.max(1, Math.floor(day || DEFAULT_START_DAY)));

const firstOfMonth = (year: number, month: number) =>
    dayjs(new Date(year, month, 1));

/** 某个月的周期锚点；29–31 日在没有该日的月份取当月最后一天 */
export const anchorFor = (year: number, month: number, startDay: number) => {
    const first = firstOfMonth(year, month);
    return first
        .date(Math.min(clampStartDay(startDay), first.daysInMonth()))
        .startOf("day");
};

/** 由锚点生成完整周期 [起始日, 次月锚点前一天] */
export const periodFrom = (anchor: Dayjs, startDay: number): [Dayjs, Dayjs] => {
    const next = anchorFor(anchor.year(), anchor.month() + 1, startDay);
    return [anchor.startOf("day"), next.subtract(1, "day").endOf("day")];
};

/** 包含 now 的周期 */
export const periodContaining = (
    now: Dayjs,
    startDay: number,
): [Dayjs, Dayjs] => {
    let anchor = anchorFor(now.year(), now.month(), startDay);
    if (now.isBefore(anchor)) {
        anchor = anchorFor(now.year(), now.month() - 1, startDay);
    }
    return periodFrom(anchor, startDay);
};

/** 起始日变更时：取 strictly after 给定日期的第一个新锚点，避免与当前周期重叠 */
export const firstAnchorAfter = (after: Dayjs, startDay: number): Dayjs => {
    for (let i = 0; i < 24; i++) {
        const anchor = anchorFor(after.year(), after.month() + i, startDay);
        if (anchor.isAfter(after)) {
            return anchor;
        }
    }
    return anchorFor(after.year(), after.month() + 24, startDay);
};

/** 某归属月对应的完整周期；起始日为 1 时等价于自然月 */
export const periodForMonth = (
    month: Dayjs,
    startDay: number,
): [Dayjs, Dayjs] =>
    periodFrom(anchorFor(month.year(), month.month(), startDay), startDay);

/** 归属月份标签：取周期起始日所在年月 */
export const periodMonthKey = (periodStart: number | Dayjs) =>
    dayjs(periodStart).format("YYYY-MM");

export const periodLabel = (start: Dayjs, end: Dayjs) =>
    `${start.format("M/D")} - ${end.format("M/D")}`;
