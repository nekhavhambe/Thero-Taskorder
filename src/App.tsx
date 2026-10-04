import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { Layout, TaskOrders } from './components';
import { SalesOrder } from './page';
import { Requisitions } from './page';
import { Cashflow } from './page';
import { Tasks } from './page';

function TaskOrderRoute() {
  return <TaskOrders />;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/task-order" replace />} />
          <Route path="/task-order" element={<TaskOrderRoute />} />
          <Route path="/requisitions" element={<Requisitions />} />
          <Route path="/cashflow" element={<Cashflow />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route
            path="/sales-order"
            element={
              <SalesOrder
                onSave={(data) => {
                  console.log('RFQ saved:', data);
                }}
              />
            }
          />
          <Route path="/form" element={<Navigate to="/sales-order" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/task-order" replace />} />
      </Routes>
    </div>
  );
}

export default App;
