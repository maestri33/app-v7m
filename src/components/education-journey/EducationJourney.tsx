"use client";

import { ArrowLeft, ArrowRight, Check, MapPin, Mic, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./EducationJourney.module.css";

export type EducationLevel = "fundamental" | "medio" | "superior";
export type EducationStatus = "completed" | "attending" | "stopped";
export type EducationQualification = "graduacao" | "pos_graduacao" | "mestrado" | "doutorado";

export type EducationCity = { name: string; uf: string; ibgeCode?: string };

export type EducationJourneyValue = {
  level: EducationLevel;
  educationStatus: EducationStatus;
  grade: number | null;
  qualification: EducationQualification | null;
  lastCompletedGrade: number | null;
  lastCompletedQualification: EducationQualification | "none" | null;
  year: number;
  city: EducationCity | null;
  school: string | null;
};

type Step = "intro" | "status" | "attended" | "completed" | "year" | "location" | "cityConfirm" | "school" | "summary" | "success";
type Phase = "typing" | "listening" | "thinking" | "happy";

type Draft = {
  level: EducationLevel | null;
  educationStatus: EducationStatus | null;
  grade: number | null;
  qualification: EducationQualification | null;
  lastCompletedGrade: number | null;
  lastCompletedQualification: EducationQualification | "none" | null;
  year: string;
  city: EducationCity | null;
  school: string;
};

export type EducationJourneyProps = {
  cities?: EducationCity[];
  initialValue?: Partial<EducationJourneyValue>;
  onBack?: () => void;
  onComplete: (value: EducationJourneyValue) => void | Promise<void>;
  processingDelayMs?: number;
  typingSpeedMs?: number;
};

const CURRENT_YEAR = new Date().getFullYear();
const QUALIFICATIONS: Array<{ value: EducationQualification; label: string }> = [
  { value: "graduacao", label: "Graduação" },
  { value: "pos_graduacao", label: "Pós-graduação" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
];

function initialDraft(initialValue?: Partial<EducationJourneyValue>): Draft {
  return {
    level: initialValue?.level ?? null,
    educationStatus: initialValue?.educationStatus ?? null,
    grade: initialValue?.grade ?? null,
    qualification: initialValue?.qualification ?? null,
    lastCompletedGrade: initialValue?.lastCompletedGrade ?? null,
    lastCompletedQualification: initialValue?.lastCompletedQualification ?? null,
    year: initialValue?.year ? String(initialValue.year) : "",
    city: initialValue?.city ?? null,
    school: initialValue?.school ?? "",
  };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function levelLabel(level: EducationLevel | null) {
  if (level === "fundamental") return "Fundamental";
  if (level === "medio") return "Médio";
  if (level === "superior") return "Superior";
  return "Escolaridade";
}

function statusLabel(status: EducationStatus | null) {
  if (status === "completed") return "Terminou";
  if (status === "attending") return "Está estudando";
  if (status === "stopped") return "Não terminou";
  return "Situação";
}

function qualificationLabel(value: EducationQualification | "none" | null) {
  if (value === "none") return "Nenhuma formação superior concluída";
  return QUALIFICATIONS.find((item) => item.value === value)?.label ?? "Não informado";
}

function gradeLabel(level: EducationLevel | null, grade: number | null) {
  if (grade === null) return "Não informado";
  if (grade === 0) return "Nenhum ano concluído nessa etapa";
  if (level === "fundamental" && grade === 9) return "9º ano / antiga 8ª série";
  return `${grade}º ano${level === "medio" ? " do Ensino Médio" : ""}`;
}

function parseEducation(answer: string): Partial<Draft> | null {
  const text = normalize(answer);
  const completed = /terminei|conclui|completei|formei|formado|formada/.test(text);
  const attending = /estou estudando|ainda estudo|cursando|estou fazendo/.test(text);
  const stopped = /parei|larguei|desisti|tranquei|nao terminei|incompleto/.test(text);
  const educationStatus: EducationStatus | null = completed ? "completed" : attending ? "attending" : stopped ? "stopped" : null;

  let qualification: EducationQualification | null = null;
  if (/doutor/.test(text)) qualification = "doutorado";
  else if (/mestrad/.test(text)) qualification = "mestrado";
  else if (/pos|especializa|mba/.test(text)) qualification = "pos_graduacao";
  else if (/superior|faculdade|univers|gradua|tecnolog/.test(text)) qualification = "graduacao";

  if (qualification) {
    return {
      level: "superior",
      qualification,
      educationStatus,
      lastCompletedQualification: completed ? qualification : null,
    };
  }

  if (/medio|colegial|segundo grau/.test(text)) {
    const match = text.match(/\b([1-3])\s*[oaªº]?\s*(?:ano|serie)?\b/);
    const grade = completed && !match ? 3 : match ? Number(match[1]) : null;
    return {
      level: "medio",
      grade,
      educationStatus,
      lastCompletedGrade: completed ? grade : null,
    };
  }

  if (/fundamental|serie|primari|ginasi|\b[1-9]\s*[oaªº]?\s*ano\b/.test(text)) {
    const match = text.match(/\b([1-9])\s*[oaªº]?\s*(ano|serie)?\b/);
    let grade = match ? Number(match[1]) : null;
    if (grade === 8 && match?.[2] === "serie") grade = 9;
    return {
      level: "fundamental",
      grade,
      educationStatus,
      lastCompletedGrade: completed ? grade : null,
    };
  }

  return null;
}

function promptFor(step: Step, draft: Draft, error: string | null) {
  if (error) return error;
  if (step === "intro") return "Oi! Fala pra mim: até que ano você estudou?";
  if (step === "status") return "Boa! E nessa etapa: você terminou, ainda estuda ou parou no meio?";
  if (step === "attended") return draft.level === "superior" ? "Qual formação você chegou a frequentar?" : "Qual foi o último ano que você chegou a frequentar?";
  if (step === "completed") return draft.level === "superior" ? "E qual formação superior você realmente concluiu antes disso?" : "Qual foi o último ano que você realmente concluiu?";
  if (step === "year") return `Em que ano ${draft.educationStatus === "attending" ? "você começou essa etapa" : "isso aconteceu"}?`;
  if (step === "location") return "Última: em que cidade você mora?";
  if (step === "cityConfirm") return `${draft.city?.name ?? "Essa cidade"}… ${draft.city?.uf ? `${draft.city.uf}, né?` : "é essa mesmo?"}`;
  if (step === "school") return "Lembra o nome da escola? Se não lembrar, toca o barco.";
  if (step === "summary") return "Perfeito. Confere comigo antes de continuar.";
  return "Fechou! Já anotei tudo aqui.";
}

function Robot({ phase, oops }: { phase: Phase; oops: boolean }) {
  return (
    <div className={`${styles.robot} ${styles[phase]}`} aria-hidden="true">
      <div className={styles.antenna}><span /></div>
      <div className={styles.robotHead}>
        <div className={styles.eyes}>
          {phase === "thinking" ? <><i className={styles.gear}>✦</i><i className={styles.gear}>✦</i></> : phase === "happy" ? <><Check /><Check /></> : oops ? <><i className={styles.flatEye} /><i className={styles.flatEye} /></> : <><i className={styles.eye} /><i className={styles.eye} /></>}
        </div>
      </div>
      <div className={styles.robotBody}><span /></div>
    </div>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className={styles.chip} onClick={onClick}>{children}</button>;
}

function Choice({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className={styles.choice} onClick={onClick}>{children}</button>;
}

export function EducationJourney({ cities = [], initialValue, onBack, onComplete, processingDelayMs = 700, typingSpeedMs = 22 }: EducationJourneyProps) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initialValue));
  const [step, setStep] = useState<Step>("intro");
  const [phase, setPhase] = useState<Phase>("typing");
  const [displayedPrompt, setDisplayedPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const prompt = promptFor(step, draft, error);
  const suggestions = useMemo(() => {
    const query = normalize(cityQuery);
    if (query.length < 2) return [];
    return cities.filter((city) => normalize(`${city.name} ${city.uf}`).startsWith(query) || normalize(city.name).includes(query)).slice(0, 4);
  }, [cities, cityQuery]);

  useEffect(() => {
    let index = 0;
    let timer: number | undefined;
    const kickoff = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayedPrompt(prompt);
        setPhase("listening");
        return;
      }
      setDisplayedPrompt("");
      setPhase("typing");
      timer = window.setInterval(() => {
        index += 1;
        setDisplayedPrompt(prompt.slice(0, index));
        if (index >= prompt.length) {
          if (timer) window.clearInterval(timer);
          setPhase("listening");
        }
      }, typingSpeedMs);
    }, 0);
    return () => {
      window.clearTimeout(kickoff);
      if (timer) window.clearInterval(timer);
    };
  }, [prompt, typingSpeedMs]);

  function wait(milliseconds: number) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function react(next: Step, update?: () => void) {
    setError(null);
    setPhase("thinking");
    await wait(processingDelayMs);
    update?.();
    setPhase("happy");
    await wait(360);
    setStep(next);
    setAnswer("");
  }

  function nextAfterKnown(nextDraft: Draft) {
    if (!nextDraft.educationStatus) return "status";
    if (nextDraft.level === "superior" ? !nextDraft.qualification : !nextDraft.grade) return "attended";
    if (nextDraft.educationStatus !== "completed") return "completed";
    return "year";
  }

  async function submitIntro() {
    if (!answer.trim()) {
      setError("Me conta do seu jeito — por exemplo: ‘parei na 8ª série’. ");
      return;
    }
    const parsed = parseEducation(answer);
    if (!parsed) {
      setError("Hmm, essa parte eu não peguei… me explica de novo?");
      return;
    }
    const nextDraft = { ...draft, ...parsed };
    await react(nextAfterKnown(nextDraft), () => setDraft(nextDraft));
  }

  async function chooseStatus(educationStatus: EducationStatus) {
    const completedPatch = draft.level === "superior"
      ? { lastCompletedQualification: educationStatus === "completed" ? draft.qualification : null }
      : { lastCompletedGrade: educationStatus === "completed" ? draft.grade : null };
    const nextDraft = { ...draft, educationStatus, ...completedPatch };
    const hasAttended = draft.level === "superior" ? Boolean(draft.qualification) : Boolean(draft.grade);
    await react(hasAttended ? educationStatus === "completed" ? "year" : "completed" : "attended", () => setDraft(nextDraft));
  }

  async function chooseAttended(value: number | EducationQualification) {
    const nextDraft = draft.level === "superior"
      ? { ...draft, qualification: value as EducationQualification, lastCompletedQualification: draft.educationStatus === "completed" ? value as EducationQualification : null }
      : { ...draft, grade: value as number, lastCompletedGrade: draft.educationStatus === "completed" ? value as number : null };
    await react(draft.educationStatus === "completed" ? "year" : "completed", () => setDraft(nextDraft));
  }

  async function chooseCompleted(value: number | EducationQualification | "none") {
    const nextDraft = draft.level === "superior"
      ? { ...draft, lastCompletedQualification: value as EducationQualification | "none" }
      : { ...draft, lastCompletedGrade: value as number };
    await react("year", () => setDraft(nextDraft));
  }

  async function submitYear(event: React.FormEvent) {
    event.preventDefault();
    const year = Number(answer);
    if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR + 1) {
      setError(`Informe um ano entre 1950 e ${CURRENT_YEAR + 1}.`);
      return;
    }
    await react("location", () => setDraft((current) => ({ ...current, year: String(year) })));
  }

  async function selectCity(city: EducationCity) {
    setCityQuery(`${city.name} – ${city.uf}`);
    await react("cityConfirm", () => setDraft((current) => ({ ...current, city })));
  }

  async function skipLocation() {
    await react("summary", () => setDraft((current) => ({ ...current, city: null, school: "" })));
  }

  async function submitSchool() {
    await react("summary", () => setDraft((current) => ({ ...current, school: answer.trim() })));
  }

  function submitText(event: React.FormEvent) {
    event.preventDefault();
    if (step === "school") {
      void submitSchool();
      return;
    }
    void submitIntro();
  }

  async function finish() {
    if (!draft.level || !draft.educationStatus) return;
    setSaving(true);
    setError(null);
    setPhase("thinking");
    try {
      await wait(processingDelayMs);
      await onComplete({
        level: draft.level,
        educationStatus: draft.educationStatus,
        grade: draft.grade,
        qualification: draft.qualification,
        lastCompletedGrade: draft.lastCompletedGrade,
        lastCompletedQualification: draft.lastCompletedQualification,
        year: Number(draft.year),
        city: draft.city,
        school: draft.school || null,
      });
      setResultReady(true);
      setPhase("happy");
      await wait(650);
      setStep("success");
    } catch (error) {
      setPhase("listening");
      const message = error instanceof Error ? error.message : "";
      setError(
        message.startsWith("V7M_SAVE:")
          ? message.replace("V7M_SAVE:", "")
          : "Não consegui salvar agora, mas suas respostas continuam aqui. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  function revise(next: Step) {
    setError(null);
    setStep(next);
    setPhase("typing");
  }

  function restart() {
    setDraft(initialDraft(initialValue));
    setStep("intro");
    setPhase("typing");
    setAnswer("");
    setCityQuery("");
    setError(null);
    setResultReady(false);
  }

  const showTextInput = phase === "listening" && (step === "intro" || step === "year" || step === "school");
  const showCityInput = phase === "listening" && step === "location";
  const oops = Boolean(error) && step === "intro";

  return (
    <section className={styles.shell} aria-labelledby="education-title">
      <div className={styles.marks} aria-hidden><i /><i /><i /></div>
      <header className={styles.header}>
        <p>Formação</p>
        <h1 id="education-title">Até onde você estudou?</h1>
        <span>Responde o assistente — escolaridade e cidade, rapidinho.</span>
      </header>

      <div className={styles.journey}>
        <div className={styles.chips} aria-label="Respostas reconhecidas">
          {draft.level && <Chip onClick={() => revise("intro")}>{levelLabel(draft.level)}</Chip>}
          {draft.educationStatus && <Chip onClick={() => revise("status")}>{statusLabel(draft.educationStatus)}</Chip>}
          {draft.city && <Chip onClick={() => revise("location")}>{draft.city.name} – {draft.city.uf}</Chip>}
        </div>

        <div className={styles.balloon} role="status" aria-live="polite">
          {phase === "thinking" ? <div className={styles.thinkingDots}><i /><i /><i /></div> : <>
            <p>{displayedPrompt}</p>
            {step === "intro" && phase === "listening" && <small>{oops ? "Ex.: ‘estudei até a 8ª série’ ou ‘terminei o médio’" : "pode escrever do seu jeito, ex.: ‘parei na 8ª série’"}</small>}
          </>}
          <span aria-hidden />
        </div>

        <Robot phase={phase} oops={oops} />

        {showTextInput && <form className={styles.inputRow} onSubmit={step === "year" ? submitYear : submitText} noValidate>
          <input aria-label={step === "year" ? "Ano" : step === "school" ? "Nome da escola (opcional)" : "Resposta sobre sua escolaridade"} inputMode={step === "year" ? "numeric" : "text"} value={answer} onChange={(event) => { setAnswer(step === "year" ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value); if (error) setError(null); }} placeholder={step === "year" ? `ex.: ${CURRENT_YEAR}` : step === "school" ? "nome da escola (opcional)…" : "escreva do seu jeito…"} />
          {step === "intro" && <button type="button" className={styles.micButton} aria-label="Falar" onClick={() => setAnswer("parei na 8ª série")}><Mic /></button>}
          <button type="submit" className={styles.sendButton} aria-label="Enviar"><ArrowRight /></button>
        </form>}

        {showCityInput && <div className={styles.cityBlock}>
          <div className={styles.inputRow}><input aria-label="Cidade" value={cityQuery} onChange={(event) => { setCityQuery(event.target.value); setDraft((current) => ({ ...current, city: null })); setError(null); }} placeholder="digite pelo menos 2 letras…" /><button type="button" className={styles.sendButton} aria-label="Buscar cidade" onClick={() => { if (cityQuery.trim() && !draft.city) setError("Escolha uma cidade da lista — ou pule por agora."); }}><MapPin /></button></div>
          {suggestions.length > 0 && <div className={styles.suggestions} role="listbox" aria-label="Cidades encontradas">{suggestions.map((city) => <button type="button" role="option" aria-selected="false" key={`${city.ibgeCode ?? city.name}-${city.uf}`} onClick={() => void selectCity(city)}>{city.name} – {city.uf}</button>)}</div>}
          <button type="button" className={styles.skip} onClick={() => void skipLocation()}>não sei agora · continuar sem cidade</button>
        </div>}

        {phase === "listening" && step === "status" && <div className={styles.buttonRow}>
          <Choice onClick={() => void chooseStatus("completed")}>Terminei</Choice>
          <Choice onClick={() => void chooseStatus("attending")}>Ainda estudo</Choice>
          <Choice onClick={() => void chooseStatus("stopped")}>Parei</Choice>
        </div>}

        {phase === "listening" && step === "attended" && (draft.level === "superior" ? <div className={styles.choiceGrid}>{QUALIFICATIONS.map((item) => <Choice key={item.value} onClick={() => void chooseAttended(item.value)}>{item.label}</Choice>)}</div> : <div className={styles.numberGrid}>{Array.from({ length: draft.level === "medio" ? 3 : 9 }, (_, index) => index + 1).map((grade) => <Choice key={grade} onClick={() => void chooseAttended(grade)}>{grade}º ano</Choice>)}</div>)}

        {phase === "listening" && step === "completed" && (draft.level === "superior" ? <div className={styles.choiceGrid}><Choice onClick={() => void chooseCompleted("none")}>Nenhuma</Choice>{QUALIFICATIONS.filter((item) => QUALIFICATIONS.findIndex((option) => option.value === item.value) < QUALIFICATIONS.findIndex((option) => option.value === draft.qualification)).map((item) => <Choice key={item.value} onClick={() => void chooseCompleted(item.value)}>{item.label}</Choice>)}</div> : <div className={styles.numberGrid}><Choice onClick={() => void chooseCompleted(0)}>Nenhum</Choice>{Array.from({ length: Math.max(0, (draft.grade ?? 1) - 1) }, (_, index) => index + 1).map((grade) => <Choice key={grade} onClick={() => void chooseCompleted(grade)}>{grade}º ano</Choice>)}</div>)}

        {phase === "listening" && step === "cityConfirm" && <div className={styles.buttonRow}><Choice onClick={() => void react("school")}>Isso!</Choice><Choice onClick={() => { setDraft((current) => ({ ...current, city: null })); setCityQuery(""); revise("location"); }}>corrigir</Choice></div>}
        {phase === "listening" && step === "school" && <button type="button" className={styles.skip} onClick={() => void submitSchool()}>não lembro · continuar</button>}

        {step === "success" && <div className={styles.success}><span><Check /></span><strong>Resposta pronta para salvar</strong><p>Dados organizados sem perder o jeito natural de responder.</p><button type="button" onClick={restart}><RotateCcw /> testar de novo</button></div>}
      </div>

      {step === "summary" && <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Revise sua escolaridade">
        <div className={styles.sheet}>
          <div className={styles.miniRobot}><i /><i /></div>
          <div className={styles.timeline}><button type="button" onClick={() => revise("intro")}><span><Check /></span>Etapa</button><i /><button type="button" onClick={() => revise("completed")}><span><Check /></span>Conclusão</button><i /><button type="button" onClick={() => revise("location")}><span><MapPin /></span>Local</button></div>
          <button type="button" className={styles.summaryLine} onClick={() => revise("attended")}><small>Até onde chegou</small><strong>{draft.level === "superior" ? qualificationLabel(draft.qualification) : gradeLabel(draft.level, draft.grade)}</strong></button>
          <button type="button" className={styles.summaryLine} onClick={() => revise(draft.educationStatus === "completed" ? "attended" : "completed")}><small>Concluiu de verdade</small><strong>{draft.level === "superior" ? qualificationLabel(draft.lastCompletedQualification) : gradeLabel(draft.level, draft.lastCompletedGrade)}</strong></button>
          <button type="button" className={styles.mapLine} onClick={() => revise("location")}><MapPin /><strong>{draft.city ? `${draft.city.name} – ${draft.city.uf}` : "Cidade não informada"}</strong></button>
          <div className={styles.sheetActions}><button type="button" className={styles.confirm} disabled={saving} onClick={() => void finish()}>{saving ? "Analisando…" : "Tá certo!"}</button><button type="button" className={styles.correct} onClick={() => revise("intro")}>corrigir algo</button></div>
          {error && <p className={styles.saveError} role="alert">{error}</p>}
        </div>
      </div>}

      {resultReady && step !== "success" && <div className={styles.confetti} aria-hidden>{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--index": index } as React.CSSProperties} />)}</div>}
      {onBack && <button type="button" className={styles.back} onClick={onBack}><ArrowLeft /> Voltar</button>}
    </section>
  );
}
