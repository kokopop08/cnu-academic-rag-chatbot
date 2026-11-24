import { useState } from 'react'
import './App.css'

function App() {
  const [loading, setLoading] = useState(false)
  const [apiResult, setApiResult] = useState(null)
  const [error, setError] = useState('')
  const [checkedAt, setCheckedAt] = useState('')

  const rawApiUrl = import.meta.env.VITE_API_URL
  const normalizedApiUrl = rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, '') : ''
  const healthUrl = normalizedApiUrl ? `${normalizedApiUrl}/health` : ''

  const handleTestConnection = async () => {
    setLoading(true)
    setError('')

    try {
      if (!import.meta.env.VITE_API_URL || !normalizedApiUrl) {
        throw new Error(
          'VITE_API_URL 환경변수가 설정되지 않았습니다. frontend/.env 파일을 확인해주세요.',
        )
      }

      const response = await fetch(`${normalizedApiUrl}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      const rawText = await response.text()
      let data = null

      if (rawText) {
        try {
          data = JSON.parse(rawText)
        } catch {
          data = null
        }
      }

      if (!response.ok) {
        const detail =
          data?.error || data?.message || rawText || `HTTP ${response.status}`
        throw new Error(`백엔드 응답 오류 (${response.status}): ${detail}`)
      }

      if (!data || typeof data !== 'object') {
        throw new Error('백엔드에서 올바른 JSON 응답을 반환하지 않았습니다.')
      }

      setApiResult(data)
      setCheckedAt(new Date().toLocaleString('ko-KR'))
    } catch (err) {
      setApiResult(null)
      if (err instanceof TypeError) {
        setError(
          `네트워크 또는 CORS 오류가 발생했습니다. API 주소(${healthUrl})와 백엔드 CORS 설정을 확인해주세요.`,
        )
      } else {
        setError(err.message || 'API 연결 테스트 중 알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isStatusOk = apiResult?.status === 'ok'
  const isS3Connected = apiResult?.s3_status === 'connected'

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <span className="badge">CNU RAG Chatbot · Week 2 AWS Test</span>
          <h1 className="title">충남대학교 학사·장학 AI 챗봇 (2주차 환경 테스트)</h1>
          <p className="subtitle">
            API Gateway, AWS Lambda, S3 버킷 연동 상태를 확인하는 테스트 대시보드입니다.
          </p>
        </header>

        <section className="control-panel" aria-label="API 연결 테스트 제어">
          <div className="endpoint-box">
            <span className="endpoint-label">Health Check Endpoint</span>
            <div className="endpoint-value">
              <span className="method-tag">GET</span>
              {healthUrl ? (
                <code className="endpoint-url">{healthUrl}</code>
              ) : (
                <span className="endpoint-missing">
                  VITE_API_URL 미설정 (frontend/.env 확인 필요)
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="test-button"
            onClick={handleTestConnection}
            disabled={loading}
          >
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? '연결 확인 중...' : 'AWS 백엔드 API 연결 테스트'}
          </button>
        </section>

        {loading && (
          <div className="status-banner status-loading" role="status" aria-live="polite">
            <span>AWS Lambda 백엔드 및 S3 버킷 연결 상태를 조회하고 있습니다...</span>
          </div>
        )}

        {error && (
          <div className="status-banner status-error" role="alert">
            <div>
              <p className="status-error-title">연결 테스트 실패</p>
              <p className="status-error-message">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && !apiResult && (
          <div className="empty-state">
            상단의 <strong>AWS 백엔드 API 연결 테스트</strong> 버튼을 눌러 AWS Lambda 및 S3
            연결 상태를 확인하세요.
          </div>
        )}

        {apiResult && (
          <section className="result-section" aria-label="API 응답 결과">
            <div className="result-header">
              <h2 className="result-title">AWS 백엔드 상태 응답</h2>
              {checkedAt && <span className="checked-at">최근 확인: {checkedAt}</span>}
            </div>

            <div className="card-grid">
              <article className="info-card">
                <div className="info-card-header">
                  <span className="info-label">API 상태</span>
                  <span className="info-key">status</span>
                </div>
                <div className="info-value">
                  <span className={`pill ${isStatusOk ? 'pill-success' : 'pill-warning'}`}>
                    <span className="pill-dot" aria-hidden="true" />
                    {apiResult.status ?? '-'}
                  </span>
                </div>
              </article>

              <article className="info-card">
                <div className="info-card-header">
                  <span className="info-label">S3 연결 상태</span>
                  <span className="info-key">s3_status</span>
                </div>
                <div className="info-value">
                  <span
                    className={`pill ${isS3Connected ? 'pill-success' : 'pill-warning'}`}
                  >
                    <span className="pill-dot" aria-hidden="true" />
                    {apiResult.s3_status ?? '-'}
                  </span>
                </div>
              </article>

              <article className="info-card info-card-wide">
                <div className="info-card-header">
                  <span className="info-label">서비스명</span>
                  <span className="info-key">service</span>
                </div>
                <div className="info-value">{apiResult.service ?? '-'}</div>
              </article>

              <article className="info-card">
                <div className="info-card-header">
                  <span className="info-label">AWS 리전</span>
                  <span className="info-key">region</span>
                </div>
                <div className="info-value">{apiResult.region ?? '-'}</div>
              </article>

              <article className="info-card">
                <div className="info-card-header">
                  <span className="info-label">업로드된 문서 수</span>
                  <span className="info-key">uploaded_docs_count</span>
                </div>
                <div className="info-value">
                  {apiResult.uploaded_docs_count ?? 0}개
                </div>
              </article>

              <article className="info-card info-card-wide">
                <div className="info-card-header">
                  <span className="info-label">S3 버킷명</span>
                  <span className="info-key">s3_bucket</span>
                </div>
                <div className="info-value">{apiResult.s3_bucket ?? '-'}</div>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
