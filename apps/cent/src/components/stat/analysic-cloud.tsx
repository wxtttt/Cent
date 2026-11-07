import { useEffect, useRef, useState } from "react";
import { useSize } from "react-use";
import WordCloud from "wordcloud";
import { useTheme } from "@/hooks/use-theme";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import { processText } from "@/utils/word";
import { MysteryLoading } from "../loading/mystery";

type WordCut = Awaited<ReturnType<typeof processText>>;

const DPR = window.devicePixelRatio || 2;

function TextCloud({ data, className }: { data: WordCut; className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    const [sized, { width, height }] = useSize(({ width, height }) => (
        <div
            ref={wrapperRef}
            className={cn("relative w-full h-full", className)}
        >
            <canvas
                ref={(el) => {
                    canvasRef.current = el;
                }}
                width={width * DPR}
                height={height * DPR}
                className="w-full h-full"
            />
        </div>
    ));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || width === 0 || height === 0) {
            return;
        }
        const list = data;
        WordCloud(canvas, {
            list,
            gridSize: 16,
            weightFactor: (size) => {
                // 简单的动态缩放逻辑，避免词太大或太小
                const max = list[0][1];
                return Math.max((size / max) * 60, 10) * DPR; // 最大字号60px
            },
            fontFamily: "sans-serif",
            color: theme === "dark" ? "random-light" : "random-dark",
            backgroundColor: "transparent",
            rotateRatio: 0.5,
            drawOutOfBound: false,
        });
    }, [data, width, height, theme]);
    return sized;
}

export function AnalysisCloud({ bills }: { bills?: { comment?: string }[] }) {
    const t = useIntl();
    const [wordCut, setWordCut] = useState<WordCut>();
    useEffect(() => {
        const texts: string[] = [];
        bills?.forEach(({ comment }) => {
            if (comment !== undefined) {
                texts.push(comment);
            }
        }, []);
        processText(texts).then(setWordCut);
    }, [bills]);
    return (
        <div className="relative flex w-full flex-col rounded-card border border-rule bg-panel p-5 shadow-card">
            <h2 className="text-lg font-bold">{t("comment-cloud")}</h2>
            {wordCut === undefined ? (
                <MysteryLoading className="mt-4 w-full h-[220px] rounded-2xl">
                    <div className="text-[white] text-sm">{t("loading")}</div>
                </MysteryLoading>
            ) : wordCut.length === 0 ? (
                <div className="py-10 text-center text-sm text-ink-secondary">
                    {t("no-comment-cloud")}
                </div>
            ) : (
                <div className="mt-4 h-[220px]">
                    <TextCloud data={wordCut} />
                </div>
            )}
        </div>
    );
}
