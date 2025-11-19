import React, { useCallback, useMemo, useState } from 'react';
import { Button, ButtonSet, Layer } from '@carbon/react';
import { formatDate, isOmrsDateToday, parseDate, showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Information } from '@carbon/react/icons';
import { useTask, deleteTask, toggleTaskCompletion, taskListSWRKey, type Task } from './task-list.resource';
import { useSWRConfig } from 'swr';
import styles from './task-details-view.scss';
import Loader from '../loader/loader.component';
import { type DueDateType } from './task-list.resource';

export interface TaskDetailsViewProps {
  patientUuid: string;
  taskUuid: string;
  onBack: () => void;
  onEdit?: (task: Task) => void;
}

export interface DueDateDisplay {
  type?: DueDateType;
  dueDate?: string;
  schedulingInfo?: string;
}

const TaskDetailsView: React.FC<TaskDetailsViewProps> = ({ patientUuid, taskUuid, onBack, onEdit }) => {
  const { t } = useTranslation();
  const { task, isLoading, error, mutate } = useTask(taskUuid);
  const { mutate: mutateList } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = useCallback(async () => {
    // TODO: Add a confirmation dialog
    if (!task) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTask(patientUuid, task);
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

  const handleToggleCompletion = useCallback(
    async (completed: boolean) => {
      if (!task) {
        return;
      }

      setIsUpdating(true);
      try {
        await toggleTaskCompletion(patientUuid, task, completed);
        await mutate();
        await mutateList(taskListSWRKey(patientUuid));
        showSnackbar({
          title: completed
            ? t('taskCompleted', 'Task marked as complete')
            : t('taskIncomplete', 'Task marked as incomplete'),
          kind: 'success',
        });
      } catch (_error) {
        showSnackbar({
          title: t('taskUpdateFailed', 'Unable to update task'),
          kind: 'error',
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [task, patientUuid, mutate, mutateList, t],
  );

  const dueDateDisplay: DueDateDisplay = useMemo(() => {
    if (!task) {
      return {};
    }
    const scheduledToday = isOmrsDateToday(task.createdDate);
    if (task.dueDate?.type === 'DATE') {
      return {
        type: 'DATE',
        dueDate: formatDate(task.dueDate.date, { mode: 'wide' }),
      };
    }
    if (task.dueDate?.type === 'THIS_VISIT') {
      return {
        type: 'THIS_VISIT',
        schedulingInfo: scheduledToday
          ? t('scheduledTodayForThisVisit', 'Today for this visit')
          : t('scheduledOnThisVisit', 'On {{date}} for the same visit', {
              date: formatDate(task.createdDate),
            }),
        dueDate: task.dueDate.date ? formatDate(task.dueDate.date, { mode: 'wide' }) : undefined,
      };
    }
    if (task.dueDate?.type === 'NEXT_VISIT') {
      return {
        type: 'NEXT_VISIT',
        schedulingInfo: scheduledToday
          ? t('scheduledTodayForNextVisit', 'Today for next visit')
          : t('scheduledOnNextVisit', 'On {{date}} for the following visit', {
              date: formatDate(task.createdDate),
            }),
        dueDate: task.dueDate.date ? formatDate(task.dueDate.date, { mode: 'wide' }) : undefined,
      };
    }
    return {};
  }, [task, t]);

  const assigneeDisplay = task?.assignee
    ? (task.assignee.display ?? task.assignee.uuid)
    : t('noAssignment', 'No assignment');

  if (isLoading) {
    return <Loader />;
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

  return (
    <div className={styles.taskDetailsContainer}>
      <Layer className={styles.taskDetailsBox}>
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
          <div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>{t('name', 'Name')}</div>
              <div>{task.name}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>{t('createdBy', 'Created by')}</div>
              <div>{task.createdBy}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>{t('assignedTo', 'Assigned to')}</div>
              <div>{assigneeDisplay}</div>
            </div>
            {dueDateDisplay.type != 'DATE' && dueDateDisplay.schedulingInfo && (
              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>{t('scheduledInfo', 'Scheduled')}</div>
                <div>{dueDateDisplay.schedulingInfo}</div>
              </div>
            )}
            {dueDateDisplay.dueDate && (
              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>{t('dueDate', 'Due date')}</div>
                <div>{dueDateDisplay.dueDate}</div>
              </div>
            )}
          </div>
        </div>

        {task.rationale && (
          <div className={styles.section}>
            <h5 className={styles.sectionTitle}>{t('rationale', 'Rationale')}</h5>
            <div>
              <p>{task.rationale}</p>
            </div>
          </div>
        )}
      </Layer>
      <ButtonSet className={styles.actionButtons}>
        <Button kind="danger--tertiary" onClick={handleDelete} disabled={isDeleting}>
          {t('deleteTask', 'Delete task')}
        </Button>
        {!task.completed ? (
          <Button kind="secondary" onClick={() => handleToggleCompletion(true)} disabled={isUpdating}>
            {t('markComplete', 'Mark complete')}
          </Button>
        ) : (
          <Button kind="tertiary" onClick={() => handleToggleCompletion(false)} disabled={isUpdating}>
            {t('markIncomplete', 'Mark incomplete')}
          </Button>
        )}
      </ButtonSet>
    </div>
  );
};

export default TaskDetailsView;
