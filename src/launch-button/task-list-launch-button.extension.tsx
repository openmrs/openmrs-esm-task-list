import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMenuButton, ListCheckedIcon, launchWorkspace } from '@openmrs/esm-framework';

const TaskListActionButton: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ActionMenuButton
      getIcon={(props: ComponentProps<typeof ListCheckedIcon>) => <ListCheckedIcon {...props} />}
      label={t('taskList', 'Task list')}
      iconDescription={t('tasks', 'Tasks')}
      handler={() => launchWorkspace('task-list')}
      //   tagContent={null}
      type={'task-list'}
    />
  );
};

export default TaskListActionButton;
