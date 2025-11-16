import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import { Checkbox, Tile, Tag, Loading, InlineLoading, Layer } from '@carbon/react';
import { formatDate, parseDate, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type Task, useTaskList, toggleTaskCompletion } from './task-list.resource';
import styles from './task-list-view.scss';
import { EmptyDataIllustration, EmptyState } from '@openmrs/esm-patient-common-lib';
import Loader from '../loader/loader.component';

export interface TaskListViewProps {
  patientUuid: string;
  onTaskClick?: (task: Task) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ patientUuid, onTaskClick }) => {
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

  const isOverdue = useCallback((task: Task) => {
    if (task.completed || !task.dueDate) {
      return false;
    }
    const dueDate = parseDate(task.dueDate);
    if (!dueDate) {
      return false;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <p className={styles.errorText}>{t('taskLoadError', 'There was a problem loading the task list.')}</p>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Layer>
        <Tile className={styles.emptyStateTile}>
          <div className={styles.emptyStateTileContent}>
            <EmptyDataIllustration />
            <p className={styles.emptyStateContent}>{t('noTasksMessage', 'No tasks to display')}</p>
          </div>
        </Tile>
      </Layer>
    );
  }

  return (
    <ul className={styles.taskList}>
      {tasks.map((task) => {
        const isUpdating = pendingUpdates.has(task.uuid);
        const overdue = isOverdue(task);
        console.log('assignee', task.assignee);
        const assigneeDisplay = task.assignee
          ? (task.assignee.display ?? task.assignee.uuid)
          : t('noAssignment', 'No assignment');

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
                <div className={styles.taskTileLeft}>
                  <div
                    className={classNames(styles.checkboxWrapper, {
                      [styles.completedCheckbox]: task.completed,
                    })}
                  >
                    <Checkbox
                      id={`task-${task.uuid}`}
                      labelText=""
                      checked={task.completed}
                      disabled={isUpdating}
                      onChange={(_, { checked }) => handleToggle(task, checked)}
                    />
                  </div>
                  <div className={styles.taskNameWrapper}>
                    {onTaskClick ? (
                      <button
                        type="button"
                        className={styles.taskNameButton}
                        onClick={() => onTaskClick(task)}
                        disabled={isUpdating}
                      >
                        {task.name}
                      </button>
                    ) : (
                      <span className={styles.taskName}>{task.name}</span>
                    )}
                    {task.rationale && <div className={styles.taskRationalePreview}>{task.rationale}</div>}
                    <div className={styles.taskAssignee}>{assigneeDisplay}</div>
                  </div>
                </div>
                <div className={styles.taskTileRight}>
                  {overdue && (
                    <Tag type="red" size="sm">
                      {t('overdue', 'Overdue')}
                    </Tag>
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
