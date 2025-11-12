import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import { Checkbox, Tile } from '@carbon/react';
import { formatDate, parseDate, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type Task, useTaskList, toggleTaskCompletion } from './task-list.resource';
import styles from './task-list-view.scss';

export interface TaskListViewProps {
  patientUuid: string;
}

const TaskListView: React.FC<TaskListViewProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { tasks, isLoading, error, mutate } = useTaskList(patientUuid);
  const isTablet = useLayoutType() === 'tablet';
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  const addPendingUpdate = useCallback((uuid: string) => {
    setPendingUpdates((current) => {
      const next = new Set(current);
      next.add(uuid);
      return next;
    });
  }, []);

  const removePendingUpdate = useCallback((uuid: string) => {
    setPendingUpdates((current) => {
      const next = new Set(current);
      next.delete(uuid);
      return next;
    });
  }, []);

  const handleToggle = useCallback(
    async (task: Task, checked: boolean) => {
      addPendingUpdate(task.uuid);
      try {
        await toggleTaskCompletion(patientUuid, task, checked);
        await mutate();
      } catch (_error) {
        showSnackbar({
          title: t('taskUpdateFailed', 'Unable to update task'),
          kind: 'error',
        });
      } finally {
        removePendingUpdate(task.uuid);
      }
    },
    [addPendingUpdate, mutate, patientUuid, removePendingUpdate, t],
  );

  if (isLoading) {
    return <p className={styles.helperText}>{t('loadingTasks', 'Loading tasks...')}</p>;
  }

  if (error) {
    return <p className={styles.errorText}>{t('taskLoadError', 'There was a problem loading the task list.')}</p>;
  }

  if (!tasks || tasks.length === 0) {
    return <p className={styles.helperText}>{t('noTasksMessage', 'No tasks yet')}</p>;
  }

  return (
    <ul className={styles.taskList}>
      {tasks.map((task) => {
        const isUpdating = pendingUpdates.has(task.uuid);
        const dueDateDisplay = task.dueDate
          ? formatDate(parseDate(task.dueDate))
          : null;

        return (
          <li key={task.uuid}>
            <Tile
              role="listitem"
              className={classNames(styles.taskTile, {
                [styles.tabletTaskTile]: isTablet,
                [styles.completedTile]: task.completed,
              })}
            >
              <div className={styles.taskTileContent}>
                <div className={styles.taskHeader}>
                  <div
                    className={classNames(styles.checkboxWrapper, {
                      [styles.completedCheckbox]: task.completed,
                    })}
                  >
                    <Checkbox
                      id={`task-${task.uuid}`}
                      labelText={task.name}
                      checked={task.completed}
                      disabled={isUpdating}
                      onChange={(_, { checked }) => handleToggle(task, checked)}
                    />
                  </div>
                  {dueDateDisplay && (
                    <span className={styles.dueDate}>
                      {t('dueLabel', 'Due')} {dueDateDisplay}
                    </span>
                  )}
                </div>
                <div className={styles.taskBody}>
                  {task.assignee && (
                    <div className={styles.taskMeta}>
                      <span className={styles.metaLabel}>{t('assignedToLabel', 'Assigned to')}</span>
                      <span>{task.assignee.display ?? task.assignee.uuid}</span>
                    </div>
                  )}
                  {task.assignee && task.assignee.type === 'role' && (
                    <div className={styles.taskMeta}>
                      <span className={styles.metaLabel}>{t('assignedRoleLabel', 'Assigned role')}</span>
                      <span>{task.assignee.display ?? task.assignee.uuid}</span>
                    </div>
                  )}
                  {task.rationale && (
                    <div className={styles.taskRationale}>
                      <span className={styles.metaLabel}>{t('rationaleLabel', 'Rationale')}</span>
                      <p>{task.rationale}</p>
                    </div>
                  )}
                </div>
              </div>
            </Tile>
          </li>
        );
      })}
    </ul>
  );
};

export default TaskListView;