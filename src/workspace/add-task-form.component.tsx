import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, FieldErrors, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, Layer, TextInput } from '@carbon/react';
import { showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import styles from './add-task-form.scss';
import { saveTask } from './task-list.resource';

export interface AddTaskFormProps {
    patientUuid: string;
    goBackToListView: () => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ patientUuid, goBackToListView }) => {

    const { t } = useTranslation();

    const schema = z.object({
        taskName: z.string().min(1),
    });

    const { control, handleSubmit } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
    });

    const handleFormSubmission = async (data: z.infer<typeof schema>) => {
        console.log(data);
        try {
          await saveTask(patientUuid, { name: data.taskName });
          showSnackbar({
            title: t("taskAdded", "Task added"),
            kind: 'success',
          })
          goBackToListView();
        } catch (error) {
          showSnackbar({
            title: t("taskAddFailed", "Task add failed"),
            kind: 'error',
          })
        }
    };

    const onError = (errors: FieldErrors<z.infer<typeof schema>>) => {
        console.log(errors);
    };

  return (
    <div>
      <h1>Add Task</h1>
      <Form onSubmit={handleSubmit(handleFormSubmission, onError)}>
        <InputWrapper>
        <Controller
          name="taskName"
          control={control}
          render={({ field }) => (
            <TextInput
              id="taskName"
              labelText={t("taskNameLabel", "Task name")}
              placeholder={t("taskNamePlaceholder", "Enter task name")}
              {...field}
            />
          )}
        />
        </InputWrapper>
        <button type="submit">{t("addTaskButton", "Add Task")}</button>
      </Form>
    </div>
  );
};

function InputWrapper({ children }) {                                                                            
    const isTablet = useLayoutType() === 'tablet';                                                                 
    return (                                                                                                       
      <Layer level={isTablet ? 1 : 0}>                                                                             
        <div className={styles.field}>{children}</div>                                                             
      </Layer>                                                                                                     
    );                                                                                                             
  }      

export default AddTaskForm;