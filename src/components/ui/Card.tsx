import { ReactNode } from 'react'

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-panel atk-card rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}
