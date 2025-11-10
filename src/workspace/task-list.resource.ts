import useSWR from 'swr';
import { restBaseUrl, openmrsFetch } from '@openmrs/esm-framework';
import { useMemo } from 'react';

export interface Task {
    name: string;
}

export interface FHIRCarePlanResponse {
    entry: Array<{
        resource: fhir.CarePlan;
    }>;
}

const carePlanEndpoint = `${restBaseUrl}/tasks/careplan`;

export function useTaskList(patientUuid: string) {
    const { data, isLoading, error } = useSWR<{ data: FHIRCarePlanResponse }>(`${carePlanEndpoint}?subject=Patient/${patientUuid}`, openmrsFetch);
    const results = useMemo(() => {
        return data?.data?.entry?.map((entry) => createTaskFromCarePlan(entry.resource));
    }, [data]);

    return { tasks: results, isLoading, error };
}

function createTaskFromCarePlan(carePlan: fhir.CarePlan): Task {
    return {
        name: carePlan.activity[0].detail.description,
    };
}

export function saveTask(patientUuid: string, task: Task) {
    const carePlan = createCarePlanFromTask(patientUuid, task);
    return saveCarePlan(carePlan);
}

function saveCarePlan(carePlan: fhir.CarePlan) {
    const taskEndpoint = carePlanEndpoint;
    const abortController = new AbortController();
    return openmrsFetch(taskEndpoint, {
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(carePlan),
        signal: abortController.signal,
    });
}

function createCarePlanFromTask(patientUuid: string, task: Task): fhir.CarePlan {
    return {
        resourceType: 'CarePlan',
        status: 'active',
        intent: 'order',
        subject: {
            reference: `Patient/${patientUuid}`,
        },
        activity: [
            {
                detail: {
                    status: 'not-started',
                    description: task.name,
                },
            },
        ],
    };
}