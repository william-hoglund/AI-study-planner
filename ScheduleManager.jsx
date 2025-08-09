import React, { useContext, useState } from 'react';
import { ScheduleContext } from '../context/ScheduleContext.jsx';

const ScheduleManager = () => {
  const { schedule, addScheduleItem } = useContext(ScheduleContext);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      addScheduleItem(newItem);
      setNewItem('');
    }
  };

  return (
    <div>
      <h2>Your Schedule</h2>
      <ul>
        {schedule.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <input
        type="text"
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        placeholder="Add a new schedule item"
      />
      <button onClick={handleAddItem}>Add</button>
    </div>
  );
};

export default ScheduleManager;