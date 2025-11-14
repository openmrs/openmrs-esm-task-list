import React, { useCallback, useState } from 'react';
import { Button, ButtonSet } from '@carbon/react';
import { formatDate, parseDate, showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Information } from '@carbon/react/icons';
import { useTask, deleteTask, toggleTaskCompletion, taskListSWRKey, type Task } from './task-list.resource';
import { useSWRConfig } from 'swr';
import styles from './task-details-view.scss';

export interface TaskDetailsViewProps {
  patientUuid: string;
  taskUuid: string;
  onBack: () => void;
  onEdit?: (task: Task) => void;
}

const TaskDetailsView: React.FC<TaskDetailsViewProps> = ({ patientUuid, taskUuid, onBack, onEdit }) => {
  const { t } = useTranslation();
  const { task, isLoading, error, mutate } = useTask(taskUuid);
  const { mutate: mutateList } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!task || !window.confirm(t('confirmDeleteTask', 'Are you sure you want to delete this task?'))) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTask(task.uuid);
      await mutateList(taskListSWRKey(patientUuid));
      showSnackbar({
        title: t('taskDeleted', 'Task deleted'),
        kind: 'success',
      });
      onBack();
    } catch (_error) {
      showSnackbar({
        title: t('taskDeleteFailed', 'Unable to delete task'),
        kind: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [task, mutateList, patientUuid, onBack, t]);

  const handleMarkComplete = useCallback(async () => {
    if (!task) {
      return;
    }

    setIsCompleting(true);
    try {
      await toggleTaskCompletion(patientUuid, task, true);
      await mutate();
      await mutateList(taskListSWRKey(patientUuid));
      showSnackbar({
        title: t('taskCompleted', 'Task marked as complete'),
        kind: 'success',
      });
    } catch (_error) {
      showSnackbar({
        title: t('taskUpdateFailed', 'Unable to update task'),
        kind: 'error',
      });
    } finally {
      setIsCompleting(false);
    }
  }, [task, patientUuid, mutate, mutateList, t]);

  if (isLoading) {
    return <p className={styles.helperText}>{t('loadingTask', 'Loading task...')}</p>;
  }

  if (error || !task) {
    return (
      <>
        <p className={styles.errorText}>{t('taskLoadError', 'There was a problem loading the task.')}</p>
        <Button kind="ghost" renderIcon={(props) => <ArrowLeft size={16} {...props} />} onClick={onBack}>
          {t('backToTaskList', 'Back to task list')}
        </Button>
      </>
    );
  }

  const dueDateDisplay = task.dueDate ? formatDate(parseDate(task.dueDate)) : null;
  const assigneeDisplay = task.assignee 
    ? (task.assignee.display ?? task.assignee.uuid)
    : t('noAssignment', 'No assignment');

  return (
    <div className={styles.taskDetailsContainer}>
      <div className={styles.taskDetailsContent}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}>{t('task', 'Task')}</h5>
            {onEdit && (
              <Button
                kind="ghost"
                size="sm"
                renderIcon={(props) => <Edit size={16} {...props} />}
                onClick={() => onEdit(task)}
                className={styles.editButton}
              >
                {t('edit', 'Edit')}
              </Button>
            )}
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('name', 'Name')}:</span>
              <span className={styles.detailValueName}>{task.name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('createdBy', 'Created by')}:</span>
              <span className={styles.detailValue}>
                {t('system', 'System')}
                <Information size={16} className={styles.infoIcon} />
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('assignedTo', 'Assigned to')}:</span>
              <span className={styles.detailValue}>{assigneeDisplay}</span>
            </div>
            {dueDateDisplay && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('dueDate', 'Due date')}:</span>
                <span className={styles.detailValue}>{dueDateDisplay}</span>
              </div>
            )}
          </div>
        </div>

        {task.rationale && (
          <div className={styles.section}>
            <h5 className={styles.sectionTitle}>{t('rationale', 'Rationale')}</h5>
            <div className={styles.sectionContent}>
              <p className={styles.rationaleText}>{task.rationale}</p>
            </div>
          </div>
        )}

        <ButtonSet className={styles.actionButtons}>
          <Button
            kind="danger--tertiary"
            onClick={handleDelete}
            disabled={isDeleting}
            className={styles.deleteButton}
          >
            {t('deleteTask', 'Delete task')}
          </Button>
          {!task.completed && (
            <Button
              kind="secondary"
              onClick={handleMarkComplete}
              disabled={isCompleting}
              className={styles.completeButton}
            >
              {t('markComplete', 'Mark complete')}
            </Button>
          )}
        </ButtonSet>
      </div>
    </div>
  );
};

export default TaskDetailsView;

