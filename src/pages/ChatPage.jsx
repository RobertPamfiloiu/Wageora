import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import './ChatPage.css'

const WS_BASE = (() => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  if (backendUrl) return backendUrl.replace(/^http/, 'ws')
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
})()

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [room] = useState('general')
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return

    const url = `${WS_BASE}/api/chat/ws/${user.id}?user_name=${encodeURIComponent(user.name)}&room=${room}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'history') {
        setMessages(data.messages.map(m => ({ ...m, type: 'message' })))
      } else {
        setMessages(prev => [...prev, data])
      }
    }

    return () => ws.close()
  }, [user, room])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ message: text }))
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="chat-container">
        <div className="chat-header">
          <h2>Team Chat</h2>
          <span className={`chat-status ${connected ? 'online' : 'offline'}`}>
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => {
            if (msg.type === 'system') {
              return <div key={i} className="chat-system">{msg.message}</div>
            }
            const isMine = msg.sender_id === user?.id
            return (
              <div key={i} className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && <span className="chat-sender">{msg.sender_name}</span>}
                <div className={`chat-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                  {msg.message}
                </div>
                <span className="chat-time">
                  {new Date(msg.timestamp + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message… (Enter to send)"
            disabled={!connected}
          />
          <button className="btn btn-primary" onClick={send} disabled={!connected || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
