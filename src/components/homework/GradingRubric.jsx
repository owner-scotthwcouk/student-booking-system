import React, { useState, useEffect } from 'react'
import './homework-hub.css'

export default function GradingRubric({ onGradeChange, isEditable = false }) {
  const [rubricItems, setRubricItems] = useState([
    { id: 1, criterion: 'Accuracy', maxScore: 25, description: 'Correctness of answers' },
    { id: 2, criterion: 'Completeness', maxScore: 25, description: 'All parts addressed' },
    { id: 3, criterion: 'Presentation', maxScore: 25, description: 'Clarity and organization' },
    { id: 4, criterion: 'Effort', maxScore: 25, description: 'Work quality and effort' }
  ])

  const [scores, setScores] = useState({})
  const [totalScore, setTotalScore] = useState(0)

  useEffect(() => {
    calculateTotal()
  }, [scores])

  const calculateTotal = () => {
    const total = Object.values(scores).reduce((sum, score) => sum + (parseFloat(score) || 0), 0)
    setTotalScore(total)
    if (onGradeChange) {
      onGradeChange(total)
    }
  }

  const handleScoreChange = (itemId, value) => {
    setScores(prev => ({
      ...prev,
      [itemId]: value
    }))
  }

  const handleAddCriterion = () => {
    const newId = Math.max(...rubricItems.map(r => r.id), 0) + 1
    setRubricItems([...rubricItems, {
      id: newId,
      criterion: 'New Criterion',
      maxScore: 25,
      description: ''
    }])
  }

  const handleUpdateCriterion = (itemId, field, value) => {
    setRubricItems(rubricItems.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ))
  }

  const handleRemoveCriterion = (itemId) => {
    setRubricItems(rubricItems.filter(item => item.id !== itemId))
  }

  const maxPossibleScore = rubricItems.reduce((sum, item) => sum + item.maxScore, 0)

  return (
    <div className="rubric-container">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Grading Rubric</h3>
        {isEditable && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleAddCriterion}
          >
            + Add Criterion
          </button>
        )}
      </div>

      {rubricItems.map(item => (
        <div key={item.id} className="rubric-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isEditable ? (
            <>
              <input
                type="text"
                value={item.criterion}
                onChange={(e) => handleUpdateCriterion(item.id, 'criterion', e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  flex: 1,
                  minWidth: 0
                }}
              />
              <input
                type="number"
                value={item.maxScore}
                onChange={(e) => handleUpdateCriterion(item.id, 'maxScore', parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  width: '80px'
                }}
              />
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleRemoveCriterion(item.id)}
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <div className="rubric-criterion">{item.criterion}</div>
                <div className="rubric-description">{item.description}</div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                out of {item.maxScore}
              </div>
              <input
                type="number"
                min="0"
                max={item.maxScore}
                value={scores[item.id] || ''}
                onChange={(e) => handleScoreChange(item.id, e.target.value)}
                className="rubric-score-input"
                placeholder="0"
              />
            </>
          )}
        </div>
      ))}

      <div className="rubric-total">
        <strong>Total Score</strong>
        <div></div>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4f46e5' }}>
          {totalScore} / {maxPossibleScore}
        </div>
      </div>

      {totalScore > 0 && (
        <div style={{
          padding: '1rem',
          background: '#f3f4f6',
          textAlign: 'center',
          fontSize: '0.95rem'
        }}>
          <strong>Percentage: {((totalScore / maxPossibleScore) * 100).toFixed(1)}%</strong>
        </div>
      )}
    </div>
  )
}
