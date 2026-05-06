import { type APIRequestContext, expect } from '@playwright/test';
import { type Patient } from '../types';

export const generateRandomPatient = async (api: APIRequestContext): Promise<Patient> => {
  const identifierRes = await api.post('idgen/identifiersource/8549f706-7e85-4c1d-9424-217d50a2988b/identifier', {
    data: {},
  });
  expect(identifierRes.ok()).toBeTruthy();
  const { identifier } = await identifierRes.json();

  const patientRes = await api.post('patient', {
    data: {
      identifiers: [
        {
          identifier,
          identifierType: '05a29f94-c0ed-11e2-94be-8c13b969e334',
          location: process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID ?? '44c3efb0-2583-4c80-a79e-1f756a03c0a1',
          preferred: true,
        },
      ],
      person: {
        addresses: [
          {
            address1: 'Bom Jesus Street',
            cityVillage: 'Recife',
            country: 'Brazil',
            postalCode: '50030-310',
            stateProvince: 'Pernambuco',
          },
        ],
        attributes: [],
        birthdate: '1990-01-01',
        birthdateEstimated: false,
        dead: false,
        gender: 'M',
        names: [
          {
            familyName: `Test${Math.floor(Math.random() * 10000)}`,
            givenName: `Patient${Math.floor(Math.random() * 10000)}`,
            middleName: '',
            preferred: true,
          },
        ],
      },
    },
  });

  expect(patientRes.ok()).toBeTruthy();
  return patientRes.json();
};

export const deletePatient = async (api: APIRequestContext, uuid: string) => {
  await api.delete(`patient/${uuid}`);
};
