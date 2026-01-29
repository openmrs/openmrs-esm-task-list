import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { Add, ArrowLeft } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { type DefaultWorkspaceProps } from '@openmrs/esm-framework';
import { type Task } from './task-list.resource';
import AddTaskForm from './add-task-form.component';
import TaskListView from './task-list-view.component';
import TaskDetailsView from './task-details-view.component';
import styles from './task-list.scss';

type View = 'list' | 'form' | 'details' | 'edit';

const TaskListWorkspace: React.FC<DefaultWorkspaceProps & { patientUuid: string }> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('list');
  const [selectedTaskUuid, setSelectedTaskUuid] = useState<string | null>(null);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskUuid(task.uuid);
    setView('details');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedTaskUuid(null);
  };

  const handleEdit = (task: Task) => {
    setSelectedTaskUuid(task.uuid);
    setView('edit');
  };

  const handleEditComplete = () => {
    setView('details');
  };

  const handleBackClick = () => {
    if (view === 'edit') {
      setView('details');
      return;
    }
    setView('list');
  };

  return (
    <div className={styles.workspaceContainer}>
      {['form', 'details', 'edit'].includes(view) && (
        <div className={styles.backToTaskListButton}>
          <Button
            kind="ghost"
            renderIcon={(props) => <ArrowLeft size={16} {...props} />}
            iconDescription={t('backToTaskList', 'Back to task list')}
            onClick={() => setView('list')}
          >
            <span>{t('backToTaskList', 'Back to task list')}</span>
          </Button>
        </div>
      )}
      {view === 'form' && <AddTaskForm patientUuid={patientUuid} onBack={() => setView('list')} />}
      {view === 'list' && <TaskListView patientUuid={patientUuid} onTaskClick={handleTaskClick} />}
      {view === 'list' && (
        <div className={styles.addTaskButtonContainer}>
          <Button
            kind="ghost"
            renderIcon={(props) => <Add size={16} {...props} />}
            iconDescription={t('addTask', 'Add Task')}
            onClick={() => setView('form')}
          >
            {t('addTask', 'Add Task')}
          </Button>
        </div>
      )}
      {view === 'details' && selectedTaskUuid && (
        <TaskDetailsView
          patientUuid={patientUuid}
          taskUuid={selectedTaskUuid}
          onBack={handleBackToList}
          onEdit={handleEdit}
        />
      )}
      {view === 'edit' && selectedTaskUuid && (
        <AddTaskForm patientUuid={patientUuid} onBack={handleEditComplete} editTaskUuid={selectedTaskUuid} />
      )}
    </div>
  );
};

export default TaskListWorkspace;
