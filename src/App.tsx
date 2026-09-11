import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import './App.css'
import WasteChat from './WasteChat'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp'

interface AnalysisResult {
  item: string
  category: string
  confidence: number
  disposal: string
  explanation: string
}

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const applyFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert('Please upload a JPG, JPEG, PNG, or WebP image.')
        return
      }

      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }

      setImageFile(file)
      setImageUrl(URL.createObjectURL(file))
      setResult(null)
    },
    [imageUrl],
  )

  // --------------------------------------------------
  // REAL IBM WATSONX AI ANALYSIS
  // --------------------------------------------------

  const handleAnalyze = async () => {
    if (!imageFile) return

    setAnalyzing(true)
    setResult(null)

    try {
      const formData = new FormData()

      formData.append('image', imageFile)

      const response = await fetch(
        'http://localhost:5000/api/analyze',
        {
          method: 'POST',
          body: formData,
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.details ||
          data.error ||
          'Analysis failed',
        )
      }

      if (!data.result) {
        throw new Error(
          'No AI result received from the backend.',
        )
      }

      const aiResult: AnalysisResult = {
        item: String(data.result.item || 'Uncertain'),
        category: String(
          data.result.category || 'Uncertain',
        ),
        confidence: Number(
          data.result.confidence || 0,
        ),
        disposal: String(
          data.result.disposal ||
          'Please check your local waste-management guidelines.',
        ),
        explanation: String(
          data.result.explanation ||
          'The AI could not provide an explanation.',
        ),
      }

      setResult(aiResult)
    } catch (error) {
      console.error(
        'Waste analysis error:',
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to analyze the image.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]

    if (file) {
      applyFile(file)
    }

    e.target.value = ''
  }

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]

    if (file) {
      applyFile(file)
    }
  }

  const handleDragOver = (
    e: DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleRemove = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }

    setImageFile(null)
    setImageUrl(null)
    setResult(null)
  }

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: 'smooth',
      })

    setMenuOpen(false)
  }

  return (
    <div className="app">

      {/* ── HEADER ─────────────────────────────── */}

      <header className="site-header">
        <div className="site-header__inner">

          <div className="site-header__logo">
            <span className="logo-icon">
              ♻
            </span>

            <span className="logo-name">
              AI WasteWise
            </span>
          </div>

          <nav
            className={`site-nav${
              menuOpen
                ? ' site-nav--open'
                : ''
            }`}
            aria-label="Main navigation"
          >
            <a
              className="site-nav__link"
              onClick={() =>
                scrollTo('analyze')
              }
              href="#analyze"
            >
              Analyze
            </a>

            <a
              className="site-nav__link"
              onClick={() =>
                scrollTo('ask')
              }
              href="#ask"
            >
              Ask WasteWise
            </a>

            <a
              className="site-nav__link"
              onClick={() =>
                scrollTo('sdg')
              }
              href="#sdg"
            >
              SDG 12
            </a>

            <a
              className="site-nav__link"
              onClick={() =>
                scrollTo('responsible-ai')
              }
              href="#responsible-ai"
            >
              Responsible AI
            </a>
          </nav>

          <button
            className="btn btn--cta"
            onClick={() =>
              scrollTo('analyze')
            }
            type="button"
          >
            Try It Now
          </button>

          <button
            className="hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() =>
              setMenuOpen((v) => !v)
            }
            type="button"
          >
            <span />
            <span />
            <span />
          </button>

        </div>
      </header>

      {/* ── HERO ──────────────────────────────── */}

      <section
        className="hero"
        aria-label="Introduction"
      >
        <div className="hero__inner">

          <div className="hero__badge">
            Powered by AI · Guided by SDG 12
          </div>

          <h1 className="hero__heading">
            Identify Waste.
            <br />
            Dispose Responsibly.
          </h1>

          <p className="hero__sub">
            AI WasteWise uses artificial
            intelligence to help you identify
            waste items and choose the most
            appropriate disposal or recycling
            pathway — wherever you are.
          </p>

          <div className="hero__actions">

            <button
              className="btn btn--hero-primary"
              onClick={() =>
                scrollTo('analyze')
              }
              type="button"
            >
              Upload a Waste Image
            </button>

            <button
              className="btn btn--hero-secondary"
              onClick={() =>
                scrollTo('sdg')
              }
              type="button"
            >
              Learn About SDG 12
            </button>

          </div>

          <p className="hero__disclaimer">
            Recommendations are informational.
            Always follow your local
            waste-management rules.
          </p>

        </div>
      </section>

      {/* ── ANALYZE SECTION ───────────────────── */}

      <section
        id="analyze"
        className="section section--white"
        aria-labelledby="analyze-heading"
      >
        <div className="section__inner section__inner--narrow">

          <div className="section-header">

            <span className="section-tag">
              Step 1
            </span>

            <h2
              id="analyze-heading"
              className="section-title"
            >
              Analyze Your Waste
            </h2>

            <p className="section-desc">
              Upload a clear photo of a waste
              item. Our AI will suggest the
              correct disposal category and
              offer guidance on responsible
              disposal.
            </p>

          </div>

          <div className="analyze-card">

            {!imageFile ? (

              <div
                className={`drop-zone${
                  isDragOver
                    ? ' drop-zone--active'
                    : ''
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() =>
                  inputRef.current?.click()
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  inputRef.current?.click()
                }
                aria-label="Upload waste image"
              >

                <div className="drop-zone__icon">
                  📷
                </div>

                <p className="drop-zone__text">
                  Drag &amp; drop an image here
                </p>

                <p className="drop-zone__hint">
                  or
                </p>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    inputRef.current?.click()
                  }}
                >
                  Choose Image
                </button>

                <p className="drop-zone__formats">
                  Supported: JPG, JPEG, PNG, WebP
                </p>

              </div>

            ) : (

              <div className="preview-card">

                <img
                  src={imageUrl!}
                  alt="Selected waste"
                  className="preview-img"
                />

                <p className="preview-filename">
                  {imageFile.name}
                </p>

                <div className="preview-actions">

                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() =>
                      inputRef.current?.click()
                    }
                  >
                    Change Image
                  </button>

                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={handleRemove}
                  >
                    Remove Image
                  </button>

                </div>

              </div>

            )}

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="file-input"
              onChange={handleChange}
              aria-hidden="true"
            />

            <button
              type="button"
              className="btn btn--analyze"
              disabled={!imageFile || analyzing}
              aria-disabled={
                !imageFile || analyzing
              }
              onClick={handleAnalyze}
            >
              {analyzing
                ? 'Analyzing…'
                : 'Analyze Waste'}
            </button>

            {result && (

              <div className="result-card">

                {/* Header */}

                <div className="result-card__header">

                  <div className="result-card__title-row">

                    <span
                      className="result-card__icon"
                      aria-hidden="true"
                    >
                      🤖
                    </span>

                    <span className="result-card__label">
                      AI Waste Analysis
                    </span>

                  </div>

                  <span className="result-card__badge">
                    {result.category}
                  </span>

                </div>

                <div className="result-card__body">

                  {/* Detected item */}

                  <div className="result-item-row">

                    <span
                      className="result-item-row__icon"
                      aria-hidden="true"
                    >
                      🔍
                    </span>

                    <div>

                      <p className="result-item-row__label">
                        Detected Item
                      </p>

                      <p className="result-item-row__value">
                        {result.item}
                      </p>

                    </div>

                  </div>

                  {/* Category */}

                  <div className="result-item-row">

                    <span
                      className="result-item-row__icon"
                      aria-hidden="true"
                    >
                      ♻️
                    </span>

                    <div>

                      <p className="result-item-row__label">
                        Waste Category
                      </p>

                      <p className="result-item-row__value">
                        {result.category}
                      </p>

                    </div>

                  </div>

                  {/* Confidence */}

                  <div className="result-confidence">

                    <div className="result-confidence__top">

                      <span className="result-confidence__label">
                        <span aria-hidden="true">
                          📊
                        </span>{' '}
                        Confidence
                      </span>

                      <span className="result-confidence__pct">
                        {result.confidence}%
                      </span>

                    </div>

                    <div
                      className="result-confidence__track"
                      role="progressbar"
                      aria-valuenow={
                        result.confidence
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${result.confidence}% confidence`}
                    >

                      <div
                        className="result-confidence__fill"
                        style={{
                          width: `${result.confidence}%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* Disposal */}

                  <div className="result-item-row">

                    <span
                      className="result-item-row__icon"
                      aria-hidden="true"
                    >
                      🗑️
                    </span>

                    <div>

                      <p className="result-item-row__label">
                        Recommended Disposal
                      </p>

                      <p className="result-item-row__value">
                        {result.disposal}
                      </p>

                    </div>

                  </div>

                  {/* Explanation */}

                  <div className="result-item-row">

                    <span
                      className="result-item-row__icon"
                      aria-hidden="true"
                    >
                      💡
                    </span>

                    <div>

                      <p className="result-item-row__label">
                        Explanation
                      </p>

                      <p className="result-item-row__value">
                        {result.explanation}
                      </p>

                    </div>

                  </div>

                </div>

                {/* IBM AI notice */}

                <div className="result-rai-notice">

                  <span aria-hidden="true">
                    🤖
                  </span>

                  AI analysis powered by IBM
                  watsonx.ai using Llama 4
                  Maverick. Results are
                  informational and may be
                  uncertain.

                </div>

                {/* Location warning */}

                <p className="result-disclaimer">
                  ⚠️ Disposal guidance can vary
                  by location. Follow your local
                  waste-management rules.
                </p>

              </div>

            )}

          </div>

        </div>
      </section>

      {/* ── ASK WASTEWISE ────────────────────── */}

      <section
        id="ask"
        className="section section--tinted"
        aria-labelledby="ask-heading"
      >
        <div className="section__inner section__inner--narrow">

          <div className="section-header">

            <span className="section-tag">
              Demo Assistant
            </span>

            <h2
              id="ask-heading"
              className="section-title"
            >
              Ask WasteWise
            </h2>

            <p className="section-desc">
              Have a question about sorting,
              recycling, or disposing of waste?
              Type your question below and the
              demo assistant will guide you.
            </p>

          </div>

          <WasteChat />

        </div>
      </section>

      {/* ── SDG 12 ───────────────────────────── */}

      <section
        id="sdg"
        className="section section--white"
        aria-labelledby="sdg-heading"
      >
        <div className="section__inner section__inner--narrow">

          <div className="section-header">

            <span className="section-tag">
              United Nations · SDG 12
            </span>

            <h2
              id="sdg-heading"
              className="section-title"
            >
              SDG 12 — Responsible Consumption
              &amp; Production
            </h2>

            <p className="section-desc">
              AI WasteWise supports responsible
              consumption and production by
              helping people make better waste
              segregation, recycling, and
              disposal decisions — one item
              at a time.
            </p>

          </div>

          {/* Impact area cards */}

          <div className="sdg-cards">

            <div className="sdg-card">

              <div
                className="sdg-card__icon"
                aria-hidden="true"
              >
                🗂️
              </div>

              <h3 className="sdg-card__title">
                Better Waste Segregation
              </h3>

              <p className="sdg-card__body">
                Helps users identify waste
                categories before disposal.
              </p>

            </div>

            <div className="sdg-card">

              <div
                className="sdg-card__icon"
                aria-hidden="true"
              >
                🗑️
              </div>

              <h3 className="sdg-card__title">
                Responsible Disposal
              </h3>

              <p className="sdg-card__body">
                Provides practical disposal
                guidance and encourages users
                to follow local waste-management
                rules.
              </p>

            </div>

            <div className="sdg-card">

              <div
                className="sdg-card__icon"
                aria-hidden="true"
              >
                ♻️
              </div>

              <h3 className="sdg-card__title">
                Recycling Awareness
              </h3>

              <p className="sdg-card__body">
                Helps users understand which
                materials may have recycling
                or recovery pathways.
              </p>

            </div>

            <div className="sdg-card">

              <div
                className="sdg-card__icon"
                aria-hidden="true"
              >
                ✅
              </div>

              <h3 className="sdg-card__title">
                Reduced Waste Contamination
              </h3>

              <p className="sdg-card__body">
                Better sorting can help reduce
                contamination of recyclable and
                organic waste streams.
              </p>

            </div>

          </div>

          {/* How it supports SDG 12 */}

          <div className="sdg-flow-block">

            <h3 className="sdg-flow-block__title">
              How AI WasteWise Supports SDG 12
            </h3>

            <ol
              className="sdg-flow"
              aria-label="Four-step process"
            >
              {[
                {
                  icon: '📷',
                  label: 'Upload Waste Image',
                },
                {
                  icon: '🔍',
                  label: 'Identify Waste',
                },
                {
                  icon: '💡',
                  label: 'Recommend Action',
                },
                {
                  icon: '🌿',
                  label: 'Dispose Responsibly',
                },
              ].map((step, i, arr) => (

                <li
                  key={step.label}
                  className="sdg-flow__step"
                >

                  <div className="sdg-flow__bubble">

                    <span
                      className="sdg-flow__step-icon"
                      aria-hidden="true"
                    >
                      {step.icon}
                    </span>

                    <span className="sdg-flow__step-label">
                      {step.label}
                    </span>

                  </div>

                  {i < arr.length - 1 && (
                    <span
                      className="sdg-flow__arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}

                </li>

              ))}
            </ol>

          </div>

          {/* Prototype note */}

          <p className="sdg-prototype-note">
            AI WasteWise is an educational
            prototype. Its recommendations
            are informational and should not
            replace local waste-management
            guidance.
          </p>

        </div>
      </section>

      {/* ── RESPONSIBLE AI ───────────────────── */}

      <section
        id="responsible-ai"
        className="section section--tinted"
        aria-labelledby="rai-heading"
      >
        <div className="section__inner section__inner--narrow">

          <div className="section-header">

            <span className="section-tag">
              Design Principles
            </span>

            <h2
              id="rai-heading"
              className="section-title"
            >
              Responsible AI
            </h2>

            <p className="section-desc">
              Designed with transparency,
              fairness, privacy, and user
              safety in mind.
            </p>

          </div>

          {/* Four principle cards */}

          <div className="rai-cards">

            <div className="rai-card">

              <div
                className="rai-card__icon"
                aria-hidden="true"
              >
                🔍
              </div>

              <h3 className="rai-card__title">
                Transparency
              </h3>

              <p className="rai-card__body">
                AI WasteWise aims to clearly
                communicate when a result is
                AI-generated and what information
                was used to produce it. Users
                should not treat predictions as
                guaranteed facts — results are
                informational guidance, not
                authoritative rulings.
              </p>

            </div>

            <div className="rai-card">

              <div
                className="rai-card__icon"
                aria-hidden="true"
              >
                📊
              </div>

              <h3 className="rai-card__title">
                Uncertainty &amp; Accuracy
              </h3>

              <p className="rai-card__body">
                Image classification can be
                uncertain, especially for
                damaged, unclear, mixed, or
                unfamiliar waste items. The
                system should avoid presenting
                uncertain predictions as absolute
                facts, and confidence levels
                should be communicated clearly
                to the user.
              </p>

            </div>

            <div className="rai-card">

              <div
                className="rai-card__icon"
                aria-hidden="true"
              >
                🔒
              </div>

              <h3 className="rai-card__title">
                Privacy
              </h3>

              <p className="rai-card__body">
                Uploaded images should only be
                processed when necessary and
                should not be retained beyond
                what the task requires. Users
                should be informed about how
                their data is handled before
                submitting any content.
              </p>

            </div>

            <div className="rai-card">

              <div
                className="rai-card__icon"
                aria-hidden="true"
              >
                ⚖️
              </div>

              <h3 className="rai-card__title">
                Fairness &amp; Accessibility
              </h3>

              <p className="rai-card__body">
                The system should be tested
                across different waste types,
                image conditions, and user
                contexts so that it does not
                perform well only for a narrow
                set of examples. Diverse testing
                helps reduce bias in results.
              </p>

            </div>

          </div>

          {/* Safety First */}

          <div
            className="rai-safety-box"
            role="note"
          >

            <div className="rai-safety-box__header">

              <span aria-hidden="true">
                ⚠️
              </span>

              <span className="rai-safety-box__title">
                Safety First
              </span>

            </div>

            <p className="rai-safety-box__text">
              If the system is uncertain or
              the item may be hazardous, users
              should be directed to verify
              guidance with their local
              waste-management authority or
              an appropriate specialist.
            </p>

          </div>

          {/* Local Rules Matter */}

          <div className="rai-local-box">

            <h3 className="rai-local-box__title">
              📍 Local Rules Matter
            </h3>

            <p className="rai-local-box__text">
              Waste-management systems differ
              by city and region. AI WasteWise
              provides educational guidance
              and should not replace official
              local disposal instructions.
            </p>

          </div>

          {/* Footer note */}

          <p className="rai-footer-note">
            Responsible AI is an ongoing
            process. The prototype will be
            tested and refined as new examples
            and feedback become available.
          </p>

        </div>
      </section>

      {/* ── TARGET USERS & EXPECTED IMPACT ───── */}

      <section
        id="impact"
        className="section section--white"
        aria-labelledby="impact-heading"
      >
        <div className="section__inner section__inner--narrow">

          {/* Who it helps */}

          <div className="section-header">

            <span className="section-tag">
              SDG 12 · People
            </span>

            <h2
              id="impact-heading"
              className="section-title"
            >
              Who AI WasteWise Helps
            </h2>

          </div>

          <div className="impact-cards">

            <div className="impact-card">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                🎓
              </div>

              <h3 className="impact-card__title">
                Students &amp; Young People
              </h3>

              <p className="impact-card__body">
                Learn practical
                waste-segregation and
                responsible-disposal habits.
              </p>

            </div>

            <div className="impact-card">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                🏠
              </div>

              <h3 className="impact-card__title">
                Households
              </h3>

              <p className="impact-card__body">
                Get simple guidance when unsure
                which waste stream an item
                belongs to.
              </p>

            </div>

            <div className="impact-card">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                🏫
              </div>

              <h3 className="impact-card__title">
                Schools &amp; Colleges
              </h3>

              <p className="impact-card__body">
                Use the prototype as an
                educational tool for
                sustainability awareness.
              </p>

            </div>

            <div className="impact-card">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                🌍
              </div>

              <h3 className="impact-card__title">
                Communities
              </h3>

              <p className="impact-card__body">
                Support awareness of better
                sorting and responsible disposal
                practices.
              </p>

            </div>

          </div>

          {/* Expected impact */}

          <div className="section-header impact-subheader">

            <span className="section-tag">
              Outcomes
            </span>

            <h3 className="section-title">
              Expected Impact
            </h3>

          </div>

          <div className="impact-cards">

            <div className="impact-card impact-card--tinted">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                🗂️
              </div>

              <h3 className="impact-card__title">
                Better Sorting Decisions
              </h3>

              <p className="impact-card__body">
                Help users make more informed
                waste-segregation decisions.
              </p>

            </div>

            <div className="impact-card impact-card--tinted">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                💡
              </div>

              <h3 className="impact-card__title">
                Increased Awareness
              </h3>

              <p className="impact-card__body">
                Make waste categories and
                disposal options easier to
                understand.
              </p>

            </div>

            <div className="impact-card impact-card--tinted">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                ✅
              </div>

              <h3 className="impact-card__title">
                Reduced Confusion
              </h3>

              <p className="impact-card__body">
                Provide a simple decision-support
                interface for unfamiliar waste
                items.
              </p>

            </div>

            <div className="impact-card impact-card--tinted">

              <div
                className="impact-card__icon"
                aria-hidden="true"
              >
                ♻️
              </div>

              <h3 className="impact-card__title">
                Responsible Disposal Habits
              </h3>

              <p className="impact-card__body">
                Encourage users to verify and
                follow appropriate local disposal
                guidance.
              </p>

            </div>

          </div>

          {/* Impact Goal */}

          <div
            className="impact-goal-box"
            role="note"
          >

            <div className="impact-goal-box__header">

              <span aria-hidden="true">
                🎯
              </span>

              <span className="impact-goal-box__title">
                Impact Goal
              </span>

            </div>

            <p className="impact-goal-box__text">
              AI WasteWise aims to make
              responsible waste decisions
              easier for everyday users. The
              prototype's impact should be
              evaluated through user testing
              and feedback rather than assumed.
            </p>

          </div>

          {/* Caveat */}

          <p className="impact-caveat-note">
            These are expected outcomes, not
            measured results. Future testing
            will evaluate whether the system
            actually improves users'
            waste-disposal decisions.
          </p>

        </div>
      </section>

      {/* ── FOOTER ───────────────────────────── */}

      <footer className="site-footer">

        <div className="site-footer__inner">

          <span className="logo-name">
            AI WasteWise
          </span>

          <span className="site-footer__copy">
            Supporting SDG 12 · Powered by
            IBM watsonx.ai · Recommendations
            are informational only
          </span>

        </div>

      </footer>

    </div>
  )
}

export default App