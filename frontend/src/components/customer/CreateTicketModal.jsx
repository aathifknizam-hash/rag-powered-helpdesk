import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../common/Layout'
import { Button, Input, Textarea, Alert } from '../common/UIComponents'
import { ticketAPI } from '../../services/api'
import { Paperclip, X } from 'lucide-react'

export function CreateTicketModal({ isOpen, onClose, onCreated, initialValues = {} }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSubject(initialValues.subject || '')
      setDescription(initialValues.description || '')
      setFile(null)
      setError('')
    }
  }, [isOpen, initialValues])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Attachment is too large (max 10MB)')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim()) {
      setError('Subject is required')
      return
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      // 1. Create ticket
      const response = await ticketAPI.create({
        subject: subject.trim(),
        description: description.trim()
      })
      
      const createdTicket = response.data
      
      // 2. Upload attachment if selected
      if (file && createdTicket && createdTicket.id) {
        await ticketAPI.uploadAttachment(createdTicket.id, file)
      }

      onCreated?.()
      onClose()
      
      // Reset state
      setSubject('')
      setDescription('')
      setFile(null)
    } catch (err) {
      console.error('Failed to submit ticket request:', err)
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Submit Support Request"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Submit Request
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger" message={error} />}
        
        <Input 
          label="Subject" 
          placeholder="Brief summary of the issue (e.g. Can't log into Email)"
          value={subject} 
          onChange={(e) => setSubject(e.target.value)} 
          required 
          disabled={loading}
        />
        
        <Textarea 
          label="Description" 
          placeholder="Please provide full details. Our automated routing system will classify and route this request to the matching department specialists."
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          rows={5} 
          required 
          disabled={loading}
        />

        {/* Attachment Upload Input */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Attach Document / Screenshot (Optional)
          </label>
          
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-4 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 hover:border-slate-400 transition"
              disabled={loading}
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">Click to choose a file (max 10MB)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                <span className="text-xs text-slate-400 shrink-0">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
              <button 
                type="button"
                onClick={handleRemoveFile}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  )
}
