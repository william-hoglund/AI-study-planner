import React, { useContext, useState } from 'react';
import { ScheduleContext } from '../context/ScheduleContext.jsx';

const PriorityManager = () => {
  const { priorities, updatePriorities } = useContext(ScheduleContext);
  const [newPriority, setNewPriority] = useState('');

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      updatePriorities([...priorities, newPriority]);
      setNewPriority('');
    }
  };

  return (
    <div>
      <h2>Your Priorities</h2>
      <ul>
        {priorities.map((priority, index) => (
          <li key={index}>{priority}</li>
        ))}
      </ul>
      <input
        type="text"
        value={newPriority}
        onChange={(e) => setNewPriority(e.target.value)}
        placeholder="Add a new priority"
      />
      <button onClick={handleAddPriority}>Add Priority</button>
    </div>
  );
};

export default PriorityManager;