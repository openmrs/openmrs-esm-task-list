import React from 'react';
import classNames from 'classnames';
import { Task, useTaskList } from './task-list.resource';
import { Tile, Checkbox } from '@carbon/react';
import { useLayoutType } from '@openmrs/esm-framework';
import styles from './task-list-view.scss';

export interface TaskListViewProps {
  patientUuid: string;
}

const TaskListView: React.FC<TaskListViewProps> = ({ patientUuid }) => {
    const { tasks } = useTaskList(patientUuid);
    const isTablet = useLayoutType() == 'tablet';
    
  return <ul>
      {tasks?.map((task: Task) => (
        <Tile key={task.name} role="listitem" className={classNames(styles.taskTile, {
          [styles.tabletTaskTile]: isTablet
        })}>
          <div className={styles.taskTileContent}>
            <Checkbox id={task.name} labelText={task.name} />
          </div>
        </Tile>
      ))}
    </ul>
};

export default TaskListView;