/**
 * DatabasePage.jsx — Screen 6: Database View / Admin Demo.
 *
 * Provides a demo-safe view of the raw Firestore data structure so
 * the instructor can see:
 *   • Collection names and schemas
 *   • Sample documents from each collection
 *   • Service health / configuration status
 *
 * This screen satisfies the "Google Database" assignment requirement
 * and the "Database View" mockup from the proposal.
 */

import React, { useState, useEffect } from 'react';
import { fetchDatabaseSample, fetchHealth } from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { trackDatabaseView } from '../utils/analytics.js';

// Collection tab definitions
const COLLECTION_TABS = ['photoResults', 'audioResults', 'combinedResults'];

const COLLECTION_LABELS = {
  photoResults:    { icon: '📷', label: 'Photo Results (XXX)', color: 'var(--color-primary-light)' },
  audioResults:    { icon: '🎙️', label: 'Audio Results (YYY)',  color: 'var(--color-success)' },
  combinedResults: { icon: '✨', label: 'Combined Narratives (ZZZ)', color: '#c084fc' },
};

export default function DatabasePage() {
  const [dbData, setDbData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCollection, setActiveCollection] = useState('photoResults');
  const [expandedDoc, setExpandedDoc] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [db, h] = await Promise.all([fetchDatabaseSample(), fetchHealth()]);
        setDbData(db);
        setHealth(h);
        trackDatabaseView();
      } catch (err) {
        setError(err.message || 'Could not fetch database information.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner fullPage message="Connecting to Firestore…" />;

  const activeData = dbData?.collections?.[activeCollection];

  return (
    <div style={styles.page}>
      {/* ── Page header ──────────────────────────────────────────── */}
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>🗄️ Database View</h1>
          <p style={styles.pageSubtitle}>
            Live Firestore data — Google Cloud NoSQL document database
          </p>
        </div>
      </header>

      {error && (
        <div style={styles.errorBanner} role="alert">
          <strong>⚠ </strong>{error}
        </div>
      )}

      {/* ── Service Health Panel ──────────────────────────────────── */}
      {health && (
        <section style={styles.healthPanel}>
          <h2 style={styles.sectionTitle}>🔧 Service Configuration Status</h2>
          <div style={styles.healthGrid}>
            {Object.entries(health.services).map(([service, status]) => {
              const ok = status === 'configured' || status.startsWith('enabled');
              return (
                <div key={service} style={styles.healthItem}>
                  <span style={{ ...styles.healthDot, backgroundColor: ok ? 'var(--color-success)' : 'var(--color-error)' }} />
                  <div>
                    <p style={styles.healthServiceName}>{service}</p>
                    <p style={{ ...styles.healthStatus, color: ok ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Firestore Schema Overview ────────────────────────────── */}
      <section style={styles.schemaSection}>
        <h2 style={styles.sectionTitle}>📐 Firestore Data Model</h2>
        <div style={styles.schemaGrid}>
          {COLLECTION_TABS.map((col) => {
            const meta = COLLECTION_LABELS[col];
            const schema = dbData?.collections?.[col]?.schema || {};
            return (
              <div key={col} style={styles.schemaCard}>
                <h3 style={{ ...styles.schemaName, color: meta.color }}>
                  {meta.icon} {col}
                </h3>
                <p style={styles.schemaDesc}>{dbData?.collections?.[col]?.description}</p>
                <div style={styles.schemaFields}>
                  {Object.entries(schema).map(([field, type]) => (
                    <div key={field} style={styles.schemaField}>
                      <code style={styles.fieldName}>{field}</code>
                      <span style={styles.fieldType}>{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Collection Documents ──────────────────────────────────── */}
      <section style={styles.docsSection}>
        <h2 style={styles.sectionTitle}>📄 Sample Documents</h2>

        {/* Collection tabs */}
        <div style={styles.collectionTabs} role="tablist">
          {COLLECTION_TABS.map((col) => {
            const meta = COLLECTION_LABELS[col];
            const count = dbData?.collections?.[col]?.count || 0;
            return (
              <button
                key={col}
                role="tab"
                aria-selected={activeCollection === col}
                style={{
                  ...styles.collectionTab,
                  ...(activeCollection === col ? styles.collectionTabActive : {}),
                }}
                onClick={() => { setActiveCollection(col); setExpandedDoc(null); }}
              >
                {meta.icon} {col}{' '}
                <span style={styles.countBadge}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Document list */}
        {!activeData || activeData.count === 0 ? (
          <div style={styles.emptyDocs}>
            <p>No documents in <code>{activeCollection}</code> yet.</p>
            <p style={{ fontSize: '0.813rem', marginTop: '4px', color: 'var(--color-text-faint)' }}>
              Process photos and audio to populate this collection.
            </p>
          </div>
        ) : (
          <div style={styles.docList}>
            {activeData.documents.map((doc) => (
              <div key={doc.id} style={styles.docCard}>
                {/* Doc header */}
                <div
                  style={styles.docHeader}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                >
                  <div>
                    <code style={styles.docId}>{doc.id.slice(0, 20)}…</code>
                    <p style={styles.docMeta}>
                      {doc.userId && <span>user: {doc.userId.slice(0, 10)}…</span>}
                      {doc.processedAt && <span> · {new Date(doc.processedAt).toLocaleString()}</span>}
                    </p>
                  </div>
                  <span style={styles.expandIcon}>{expandedDoc === doc.id ? '▲' : '▼'}</span>
                </div>

                {/* Doc raw JSON */}
                {expandedDoc === doc.id && (
                  <div style={styles.docBody}>
                    <pre style={styles.docJson}>
                      {JSON.stringify(
                        {
                          ...doc,
                          outputXXX: doc.outputXXX ? doc.outputXXX.slice(0, 200) + '…' : undefined,
                          outputYYY: doc.outputYYY ? doc.outputYYY.slice(0, 200) + '…' : undefined,
                          outputZZZ: doc.outputZZZ ? doc.outputZZZ.slice(0, 200) + '…' : undefined,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Firestore query examples ──────────────────────────────── */}
      <section style={styles.queriesSection}>
        <h2 style={styles.sectionTitle}>💬 Sample Firestore Queries (used in this app)</h2>
        <div style={styles.queryList}>
          <QueryExample
            title="Step 3a — Find already-processed photos (deduplication)"
            code={`db.collection('photoResults')\n  .where('userId', '==', userId)\n  .select('photoUrl')\n  .get()`}
          />
          <QueryExample
            title="Step 6a — Fetch all journal entries for a user"
            code={`db.collection('photoResults')\n  .where('userId', '==', userId)\n  .orderBy('processedAt', 'desc')\n  .get()`}
          />
          <QueryExample
            title="Step 3c — Save a photo result"
            code={`db.collection('photoResults')\n  .doc(urlHash)\n  .set({ userId, photoUrl, outputXXX, processedAt }, { merge: true })`}
          />
          <QueryExample
            title="CRUD Demo — Delete a photo result"
            code={`db.collection('photoResults').doc(docId).delete()`}
          />
        </div>
      </section>
    </div>
  );
}

/** Displays a labelled code block for Firestore query examples. */
function QueryExample({ title, code }) {
  return (
    <div style={queryStyles.wrapper}>
      <p style={queryStyles.title}>{title}</p>
      <pre style={queryStyles.code}>{code}</pre>
    </div>
  );
}

const queryStyles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '6px' },
  title: { fontSize: '0.813rem', fontWeight: 600, color: 'var(--color-text-muted)' },
  code: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
    fontSize: '0.813rem',
    color: 'var(--color-primary-light)',
    overflowX: 'auto',
  },
};

// ── Styles ───────────────────────────────────────────────────────────
const styles = {
  page: { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' },
  pageTitle: { fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' },
  pageSubtitle: { fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' },
  sectionTitle: { fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' },
  errorBanner: { padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontSize: '0.875rem' },
  healthPanel: { display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' },
  healthGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' },
  healthItem: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', backgroundColor: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' },
  healthDot: { width: '10px', height: '10px', borderRadius: '50%', marginTop: '4px', flexShrink: 0 },
  healthServiceName: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' },
  healthStatus: { fontSize: '0.75rem' },
  schemaSection: { display: 'flex', flexDirection: 'column' },
  schemaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
  schemaCard: { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  schemaName: { fontSize: '1rem', fontWeight: 700 },
  schemaDesc: { fontSize: '0.813rem', color: 'var(--color-text-muted)' },
  schemaFields: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' },
  schemaField: { display: 'flex', justifyContent: 'space-between', fontSize: '0.813rem', padding: '4px 8px', backgroundColor: 'var(--color-surface-2)', borderRadius: '4px' },
  fieldName: { color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)' },
  fieldType: { color: 'var(--color-text-faint)' },
  docsSection: { display: 'flex', flexDirection: 'column' },
  collectionTabs: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' },
  collectionTab: { padding: '8px 18px', borderRadius: 'var(--radius-sm)', fontSize: '0.813rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' },
  collectionTabActive: { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', padding: '1px 6px', fontSize: '0.75rem' },
  emptyDocs: { padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' },
  docList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  docCard: { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' },
  docHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', userSelect: 'none' },
  docId: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-primary-light)' },
  docMeta: { fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' },
  expandIcon: { color: 'var(--color-text-faint)', fontSize: '0.75rem' },
  docBody: { borderTop: '1px solid var(--color-border)', padding: '12px 16px' },
  docJson: { fontSize: '0.75rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 },
  queriesSection: { display: 'flex', flexDirection: 'column' },
  queryList: { display: 'flex', flexDirection: 'column', gap: '16px' },
};
