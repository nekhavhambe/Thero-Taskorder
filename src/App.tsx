import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { Layout, TaskOrderHeader } from './components';
import { Form } from './page';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/task-order" replace />} />
          <Route
            path="/task-order"
            element={
              <TaskOrderHeader
                onSubmit={(data) => {
                  console.log('TaskOrder submitted:', data);
                }}
              />
            }
          />
          <Route
            path="/form"
            element={
              <Form
                onSave={(data) => {
                  console.log('RFQ saved:', data);
                }}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/task-order" replace />} />
      </Routes>
    </div>
  );
}

export default App;
