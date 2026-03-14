import React, { useState } from 'react';
import { useTasks, useProjects, useLeads } from '../components/shared/useAppData';
import TaskRow from '../components/tasks/TaskRow';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Agenda() {
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const { data: leads } = useLeads();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const currentWeekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

  const todayTasks = tasks.filter(t => !t.completed && t.due_date === todayStr);
  const tomorrowTasks = tasks.filter(t => !t.completed && t.due_date === tomorrowStr);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500 mt-1">Tu calendario de ejecución comercial</p>
      </div>

      <Tabs defaultValue="hoy">
        <TabsList className="bg-slate-100 mb-4">
          <TabsTrigger value="hoy">Hoy ({todayTasks.length})</TabsTrigger>
          <TabsTrigger value="manana">Mañana ({tomorrowTasks.length})</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
        </TabsList>

        <TabsContent value="hoy">
          <DayView label={`Hoy, ${format(today, "d 'de' MMMM", { locale: es })}`} tasks={todayTasks} leads={leads} projects={projects} />
        </TabsContent>

        <TabsContent value="manana">
          <DayView label={`Mañana, ${format(addDays(today, 1), "d 'de' MMMM", { locale: es })}`} tasks={tomorrowTasks} leads={leads} projects={projects} />
        </TabsContent>

        <TabsContent value="semana">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700">
              {format(currentWeekStart, "d MMM", { locale: es })} - {format(currentWeekEnd, "d MMM yyyy", { locale: es })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {weekDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasks.filter(t => !t.completed && t.due_date === dayStr);
              return (
                <div key={dayStr} className={`bg-white rounded-xl border ${isToday(day) ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isToday(day) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-sm font-semibold text-slate-700 capitalize">
                      {format(day, "EEEE, d 'de' MMM", { locale: es })}
                    </span>
                    {isToday(day) && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">HOY</span>}
                    {isTomorrow(day) && <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded">MAÑANA</span>}
                  </div>
                  {dayTasks.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400">Sin tareas programadas</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {dayTasks.map(t => <TaskRow key={t.id} task={t} leads={leads} projects={projects} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DayView({ label, tasks, leads, projects }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{label}</h3>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {tasks.length === 0 && (
          <div className="p-8 text-center text-slate-400">No hay tareas para este día</div>
        )}
        {tasks.map(t => <TaskRow key={t.id} task={t} leads={leads} projects={projects} />)}
      </div>
    </div>
  );
}