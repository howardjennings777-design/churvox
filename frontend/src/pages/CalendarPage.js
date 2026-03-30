import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Loader2
} from "lucide-react";
import { formatCurrency, getStatusColor, getStatusLabel, getJobTypeLabel } from "@/lib/utils";
import Layout from "@/components/Layout";

export default function CalendarPage() {
  const { get, loading } = useApi();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadJobs();
  }, [currentDate]);

  const loadJobs = async () => {
    const result = await get("/jobs");
    if (result.success) {
      setJobs(result.data);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const getJobsForDate = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return jobs.filter(job => {
      const jobDate = new Date(job.scheduled_date);
      return jobDate.toDateString() === date.toDateString();
    });
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString("en-NZ", { month: "long", year: "numeric" });
  };

  const isToday = (day) => {
    const today = new Date();
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return today.toDateString() === date.toDateString();
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return selectedDate.toDateString() === date.toDateString();
  };

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
  };

  const selectedDateJobs = selectedDate ? jobs.filter(job => {
    const jobDate = new Date(job.scheduled_date);
    return jobDate.toDateString() === selectedDate.toDateString();
  }) : [];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="calendar-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">Calendar</h1>
            <p className="text-muted-foreground mt-1">View and manage your scheduled jobs</p>
          </div>
          <Link to="/jobs/new">
            <Button className="bg-primary hover:bg-primary/90" data-testid="add-job-button">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="card-surface lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="prev-month">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg font-heading">{formatMonthYear(currentDate)}</CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="next-month">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Day names */}
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before start */}
                  {Array.from({ length: startingDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayJobs = getJobsForDate(day);
                    const hasJobs = dayJobs.length > 0;
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                          isSelected(day)
                            ? "bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : isToday(day)
                            ? "bg-primary/20 text-primary"
                            : hasJobs
                            ? "bg-secondary/50 hover:bg-secondary text-white"
                            : "hover:bg-secondary/30 text-muted-foreground"
                        }`}
                        data-testid={`calendar-day-${day}`}
                      >
                        <span className="text-sm font-medium">{day}</span>
                        {hasJobs && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayJobs.slice(0, 3).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-1 h-1 rounded-full ${
                                  isSelected(day) ? "bg-white" : "bg-primary"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Date Jobs */}
          <Card className="card-surface">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-NZ", { 
                      weekday: "short", 
                      month: "short", 
                      day: "numeric" 
                    })
                  : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Click on a date to see scheduled jobs</p>
                </div>
              ) : selectedDateJobs.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No jobs scheduled</p>
                  <Link to="/jobs/new">
                    <Button variant="link" className="mt-2 text-primary">
                      Schedule a job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                  {selectedDateJobs.map((job) => (
                    <Link key={job.id} to={`/jobs/${job.id}`}>
                      <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors border-l-2 border-l-primary">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-white text-sm truncate">{job.title}</h4>
                          <span className={`status-badge text-[10px] ${getStatusColor(job.status)}`}>
                            {getStatusLabel(job.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {job.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.scheduled_time}
                            </span>
                          )}
                          <span>{getJobTypeLabel(job.job_type)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {job.customer_name || job.address}
                        </p>
                        <p className="text-sm font-medium text-white mt-1">
                          {formatCurrency(job.price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
