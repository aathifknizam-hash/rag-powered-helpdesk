import React, { useState, useEffect } from 'react'
import { Upload, Search, Trash2, ShieldCheck, MoreVertical, FileText } from 'lucide-react'
import { Card, CardBody, Button, Badge } from '../common/UIComponents'
import { PageHeader, Modal } from '../common/Layout'
import { knowledgeAPI } from '../../services/api'
import { normalizeList } from '../../utils/apiHelpers'

const CSS = `
.kb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  background: var(--surface);
}
.kb-table th {
  text-align: left;
  padding: 12px 16px;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.kb-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}
.kb-table tr:hover td {
  background: var(--bg);
}
.kb-menu-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 4px;
}
.kb-menu-btn:hover {
  background: var(--border);
  color: var(--text-primary);
}
.kb-action-menu {
  position: absolute;
  right: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  min-width: 120px;
}
.kb-action-item {
  background: transparent;
  border: none;
  text-align: left;
  padding: 8px 12px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  cursor: pointer;
  width: 100%;
}
.kb-action-item:hover {
  background: var(--bg);
  color: var(--text-primary);
}
`

export function KnowledgeBaseAdmin() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: '', file: null })
  const [uploading, setUploading] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await knowledgeAPI.list()
      setDocuments(normalizeList(response.data))
    } catch (err) {
      console.error('Failed to fetch knowledge base:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = documents.filter((d) =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await knowledgeAPI.delete(docId)
      setDocuments(documents.filter((d) => d.id !== docId))
      setActiveMenuId(null)
    } catch (err) {
      console.error('Failed to delete document:', err)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.file || !uploadForm.title) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', uploadForm.title)
      formData.append('file', uploadForm.file)
      await knowledgeAPI.create(formData)
      setShowUpload(false)
      setUploadForm({ title: '', file: null })
      fetchDocuments()
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-full font-sans">
      <style>{CSS}</style>

      {/* 1. Page Title, 2. Description, and 3. Primary Actions */}
      <PageHeader 
        title="Knowledge Base" 
        subtitle="Upload and audit indexed documentation for RAG AI Copilot queries"
        action={
          <Button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </Button>
        } 
      />

      {/* 4. Filters & Search */}
      <Card className="mb-4 border-slate-200 bg-white">
        <CardBody className="p-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search indexed articles..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* 5. Main Content (Document Table) */}
      <Card className="border-slate-200 bg-white overflow-visible">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No documents uploaded yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">Upload a support doc, policy, or guide to train the AI assistant.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-visible">
              <table className="kb-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Document Chunks</th>
                    <th>Last Indexed</th>
                    <th>Knowledge Coverage</th>
                    <th className="w-10 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="relative">
                      <td className="font-semibold text-slate-900">{doc.title}</td>
                      <td>{doc.category || 'General Support'}</td>
                      <td>
                        <Badge 
                          size="sm" 
                          variant={doc.embedding_status === 'completed' ? 'success' : doc.embedding_status === 'failed' ? 'danger' : 'warning'}
                        >
                          {doc.embedding_status}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs">{doc.chunk_count ?? 0} chunks</td>
                      <td>{doc.last_indexed || '—'}</td>
                      <td>
                        <span className="text-xs font-semibold text-emerald-600">
                          {doc.knowledge_coverage || '100%'}
                        </span>
                      </td>
                      <td className="text-right overflow-visible relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                          className="kb-menu-btn"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {activeMenuId === doc.id && (
                          <div className="kb-action-menu">
                            <button 
                              onClick={() => handleDelete(doc.id)} 
                              className="kb-action-item text-red-600 hover:text-red-700"
                            >
                              Delete Document
                            </button>
                            <button 
                              onClick={() => setActiveMenuId(null)} 
                              className="kb-action-item"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Upload Modal (Custom Light/White Dialog Style) */}
      <Modal 
        isOpen={showUpload} 
        onClose={() => setShowUpload(false)} 
        title="Upload Document"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button loading={uploading} onClick={handleUpload}>Upload</Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleUpload}>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Document Title</label>
            <input
              type="text"
              placeholder="e.g. VPN Setup Policy"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              required
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Upload File (.pdf, .docx, .txt)</label>
            <input 
              type="file" 
              accept=".pdf,.docx,.txt" 
              onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
              required
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
