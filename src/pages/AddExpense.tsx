import { useNavigate } from 'react-router-dom';
import { PageHeader, Card } from '../components/common';
import { ExpenseForm } from '../components/expenses/ExpenseForm';

export function AddExpense() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Add Expense" description="Record a new expense." />
      <Card className="max-w-xl">
        <ExpenseForm onSaved={() => navigate('/transactions')} onCancel={() => navigate(-1)} />
      </Card>
    </div>
  );
}
