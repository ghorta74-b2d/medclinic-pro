'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { AppointmentCalendar } from '@/components/agenda/calendar-view'
import { WeekView } from '@/components/agenda/week-view'
import { MonthView } from '@/components/agenda/month-view'
import { DayStats } from '@/components/agenda/day-stats'
import { NewAppointmentDialog } from '@/components/agenda/new-appointment-dialog'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Appointment } from 'medclinic-shared'

type ViewMode = 'dia' | 'semana' | 'mes'

interface Doctor {
  id: string
  firstName: string
  lastName: string
}

function getWeekRange(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('dia')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)

  const dateStr = selectedDate.toLocaleDateString('sv-SE')

  // Load doctors for filter
  useEffect(() => {
    api.configuracion.doctors()
      .then((res: any) => setDoctors(res.data ?? []))
      .catch(() => {})
  }, [])

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      let from: Date, to: Date

      if (viewMode === 'dia') {
        from = new Date(selectedDate)
        from.setHours(0, 0, 0, 0)
        to = new Date(selectedDate)
        to.setHours(23, 59, 59, 999)
      } else if (viewMode === 'semana') {
        const range = getWeekRange(selectedDate)
        from = range.start
        to = range.end
      } else {
        const range = getMonthRange(selectedDate)
        from = range.start
        to = range.end
      }

      const params: Record<string, string> = {
        from: from.toISOString(),
        to: to.toISOString(),
      }
      if (selectedDoctorId) params['doctorId'] = selectedDoctorId

      const res = await api.appointments.list(params) as { data: Appointment[] }
      setAppointments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode, selectedDoctorId])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  function navigate(direction: 'prev' | 'next') {
    const d = new Date(selectedDate)
    if (viewMode === 'dia') {
      d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1))
    } else if (viewMode === 'semana') {
      d.setDate(d.getDate() + (direction === 'prev' ? -7 : 7))
    } else {
      d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1))
    }
    setSelectedDate(d)
  }

  const isToday = dateStr === new Date().toISOString().split('T')[0]

  const subtitle = viewMode === 'dia'
    ? formatDate(selectedDate, "EEEE, d 'de' MMMM yyyy")
    : viewMode === 'semana'
    ? (() => {
        const { start, end } = getWeekRange(selectedDate)
        return `${formatDate(start, 'd MMM')} – ${formatDate(end, 'd MMM yyyy')}`
      })()
    : formatDate(selectedDate, 'MMMM yyyy')

  return (
    <>
      <Header
        title="Agenda"
        subtitle={subtitle}
        actions={
          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva cita
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isToday ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600'
              )}
            >
              Hoy
            </button>
            <button onClick={() => navigate('next')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-1"
            />
          </div>

          {/* View mode tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
            {(['dia', 'semana', 'mes'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                  viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {mode === 'dia' ? 'Día' : mode === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          {/* Doctor filter */}
          {doctors.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDoctorId(null)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedDoctorId === null ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                )}
              >
                Todos
              </button>
              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    selectedDoctorId === doc.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  Dr. {doc.lastName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Views */}
        {viewMode === 'dia' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <AppointmentCalendar
                appointments={appointments}
                loading={loading}
                selectedDate={selectedDate}
                onRefresh={loadAppointments}
              />
            </div>
            <div className="space-y-4">
              <DayStats appointments={appointments} />
            </div>
          </div>
        )}

        {viewMode === 'semana' && (
          <WeekView
            appointments={appointments}
            loading={loading}
            referenceDate={selectedDate}
            onDayClick={(date) => { setSelectedDate(date); setViewMode('dia') }}
            onRefresh={loadAppointments}
          />
        )}

        {viewMode === 'mes' && (
          <MonthView
            appointments={appointments}
            loading={loading}
            referenceDate={selectedDate}
            onDayClick={(date) => { setSelectedDate(date); setViewMode('dia') }}
          />
        )}
      </div>

      {showNewDialog && (
        <NewAppointmentDialog
          defaultDate={selectedDate}
          onClose={() => setShowNewDialog(false)}
          onCreated={() => {
            setShowNewDialog(false)
            loadAppointments()
          }}
        />
      )}
    </>
  )
}
