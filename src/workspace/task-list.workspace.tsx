import React, { useState } from 'react';
import AddTaskForm from './add-task-form.component';
import TaskListView from './task-list-view.component';
import TaskDetailsView from './task-details-view.component';
import { type DefaultPatientWorkspaceProps } from '@openmrs/esm-patient-common-lib';
import { Button } from '@carbon/react';
import { Add, ArrowLeft } from '@carbon/react/icons';
import styles from './task-list.scss';
import { useTranslation } from 'react-i18next';
import { type Task } from './task-list.resource';

type View = 'list' | 'form' | 'details';

const TaskListWorkspace: React.FC<DefaultPatientWorkspaceProps> = ({ patientUuid }) => {
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
  
  return (
    <div className={styles.workspaceContainer}>
      {['form', 'details'].includes(view) && <div className={styles.backToTaskListButton}>
        <Button kind="ghost" renderIcon={(props) => <ArrowLeft size={16} {...props} />} iconDescription={t('backToTaskList', 'Back to task list')} onClick={() => setView('list')}>
        <span>{t('backToTaskList', 'Back to task list')}</span>
        </Button>
        </div>}
      {view === 'form' && <AddTaskForm patientUuid={patientUuid} onBack={() => setView('list')} />}
      {view === 'list' && <TaskListView patientUuid={patientUuid} onTaskClick={handleTaskClick} />}
      {view === 'list' && <div className={styles.addTaskButtonContainer}>
        <Button kind="ghost" 
              renderIcon={(props) => <Add size={16} {...props} />}
              iconDescription={t('addTask', 'Add Task')}
                   onClick={() => setView('form')}>{t('addTask', 'Add Task')}</Button></div>}
      {view === 'details' && selectedTaskUuid && (
        <TaskDetailsView
          patientUuid={patientUuid}
          taskUuid={selectedTaskUuid}
          onBack={handleBackToList}
        />
      )}
    </div>
  );
};

export default TaskListWorkspace;
