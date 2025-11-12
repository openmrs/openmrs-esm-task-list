import React, { useState } from 'react';
import AddTaskForm from './add-task-form.component';
import TaskListView from './task-list-view.component';
import { type DefaultPatientWorkspaceProps } from '@openmrs/esm-patient-common-lib';
import { Button } from '@carbon/react';
import { Add, ArrowLeft } from '@carbon/react/icons';
import styles from './task-list.scss';
import { useTranslation } from 'react-i18next';

type View = 'list' | 'form';

const TaskListWorkspace: React.FC<DefaultPatientWorkspaceProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('list');
  
  return (
    <div className={styles.workspaceContainer}>
      {view === 'form' && <div className={styles.backToTaskListButton}>
        <Button kind="ghost" renderIcon={(props) => <ArrowLeft size={16} {...props} />} iconDescription={t('backToTaskList', 'Back to task list')} onClick={() => setView('list')}>
        <span>{t('backToTaskList', 'Back to task list')}</span>
        </Button>
        </div>}
      {view === 'form' && <AddTaskForm patientUuid={patientUuid} goBackToListView={() => setView('list')} />}
      {view === 'list' && <TaskListView patientUuid={patientUuid} />}
      {view === 'list' && <div className={styles.addTaskButtonContainer}>
        <Button kind="ghost" 
               renderIcon={(props) => <Add size={16} {...props} />}
                   iconDescription={t('addTask', 'Add Task')}
                   onClick={() => setView('form')}>{t('addTask', 'Add Task')}</Button></div>}
    </div>
  );
};

export default TaskListWorkspace;
