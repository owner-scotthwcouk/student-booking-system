import React, { useState, useEffect } from 'react'
import { getTutorAnalytics } from '../../lib/homeworkHubAPI'
import './homework-hub.css'

export default function HomeworkAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('month')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { data, error } = await getTutorAnalytics('...') // TODO: Get tutor ID from auth
      if (error) throw error
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
    setLoading(false)
  }

  // Mock data for demonstration
  const mockAnalytics = {
    totalAssignments: 12,
    totalSubmissions: 48,
    submissionRate: 85,
    averageGrade: 78.5,
    onTimeRate: 92,
    lateSubmissions: 4,
    studentEngagement: 88,
    completionTrend: [
      { week: 'Week 1', completed: 8, total: 10 },
      { week: 'Week 2', completed: 9, total: 10 },
      { week: 'Week 3', completed: 7, total: 10 },
      { week: 'Week 4', completed: 10, total: 10 }
    ],
    gradeDistribution: [
      { range: 'A (90-100)', count: 12 },
      { range: 'B (80-89)', count: 18 },
      { range: 'C (70-79)', count: 12 },
      { range: 'D (60-69)', count: 4 },
      { range: 'F (0-59)', count: 2 }
    ],
    topStudents: [
      { name: 'Alice Johnson', average: 95 },
      { name: 'Bob Smith', average: 92 },
      { name: 'Charlie Brown', average: 88 }
    ],
    strugglingStudents: [
      { name: 'David Lee', average: 62 },
      { name: 'Emma White', average: 58 }
    ]
  }

  if (loading) {
    return <div>Loading analytics...</div>
  }

  const data = analyticsData || mockAnalytics

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📊 Homework Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="form-select"
          style={{ width: '200px' }}
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="semester">This Semester</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="analytics-container">
        <div className="analytics-card">
          <div className="analytics-label">Total Assignments</div>
          <div className="analytics-value">{data.totalAssignments}</div>
          <div className="analytics-change">Active this period</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">Submission Rate</div>
          <div className="analytics-value">{data.submissionRate}%</div>
          <div className="analytics-change positive">↑ 5% from last period</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">Average Grade</div>
          <div className="analytics-value">{data.averageGrade}</div>
          <div className="analytics-change">{data.averageGrade >= 80 ? '✓ Above target' : '⚠ Below target'}</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">On-Time Rate</div>
          <div className="analytics-value">{data.onTimeRate}%</div>
          <div className="analytics-change positive">↑ {data.onTimeRate - data.lateSubmissions}% compliant</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">Student Engagement</div>
          <div className="analytics-value">{data.studentEngagement}%</div>
          <div className="analytics-change positive">Active learners</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-label">Late Submissions</div>
          <div className="analytics-value">{data.lateSubmissions}</div>
          <div className="analytics-change negative">Need follow-up</div>
        </div>
      </div>

      {/* Charts & Detailed Views */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Completion Trend */}
        <div className="chart-container">
          <h3 className="chart-title">📈 Completion Trend</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.completionTrend.map((week, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>{week.week}</span>
                  <span style={{ fontWeight: '600' }}>{week.completed}/{week.total}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '24px',
                  background: '#e5e7eb',
                  borderRadius: '0.375rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(week.completed / week.total) * 100}%`,
                    height: '100%',
                    background: '#10b981',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">📊 Grade Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.gradeDistribution.map((grade, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>{grade.range}</span>
                  <span style={{ fontWeight: '600' }}>{grade.count}</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '20px',
                  background: '#e5e7eb',
                  borderRadius: '0.375rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(grade.count / Math.max(...data.gradeDistribution.map(g => g.count))) * 100}%`,
                    height: '100%',
                    background: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : '#ef4444',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top & Struggling Students */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="chart-container">
          <h3 className="chart-title">⭐ Top Performers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.topStudents.map((student, idx) => (
              <div key={idx} style={{
                padding: '1rem',
                background: '#f0fdf4',
                borderRadius: '0.5rem',
                borderLeft: '4px solid #10b981'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>{idx + 1}. {student.name}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>
                    {student.average}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">⚠️ Needs Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.strugglingStudents.map((student, idx) => (
              <div key={idx} style={{
                padding: '1rem',
                background: '#fef2f2',
                borderRadius: '0.5rem',
                borderLeft: '4px solid #ef4444'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500' }}>{idx + 1}. {student.name}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' }}>
                    {student.average}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Insights */}
      <div className="chart-container" style={{ marginTop: '2rem' }}>
        <h3 className="chart-title">💡 Key Insights</h3>
        <ul style={{ color: '#6b7280', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>Your submission rate of {data.submissionRate}% is excellent! Keep encouraging consistent homework completion.</li>
          <li>The average grade of {data.averageGrade} shows {data.averageGrade >= 80 ? 'strong student understanding' : 'potential need for additional support'}.</li>
          <li>{data.onTimeRate}% of submissions are on-time. Consider reviewing expectations with {data.lateSubmissions} students.</li>
          <li>{data.topStudents.length} students are excelling. Consider giving them advanced challenges or peer mentoring roles.</li>
          <li>{data.strugglingStudents.length} students may benefit from additional support or tutoring.</li>
        </ul>
      </div>
    </div>
  )
}
