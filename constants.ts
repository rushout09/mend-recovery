import { Protocol } from './types';

export const DEFAULT_PROTOCOLS: Protocol[] = [
  {
    id: 'knee-ext',
    name: 'Knee Extension (Post-ACL)',
    description: 'Seated knee extension to improve quadriceps strength and range of motion.',
    focusArea: 'Left Knee',
    keyInstructions: [
      'Keep your back straight against the chair.',
      'Extend the leg fully until straight.',
      'Hold at the top for 2 seconds.',
      'Lower slowly; do not let gravity drop the leg.',
      'Avoid hip rotation.'
    ]
  },
  {
    id: 'shoulder-abd',
    name: 'Shoulder Abduction (Rotator Cuff)',
    description: 'Standing side raise to improve deltoid strength.',
    focusArea: 'Right Shoulder',
    keyInstructions: [
      'Stand with feet shoulder-width apart.',
      'Raise arm to the side only to shoulder height (90 degrees).',
      'Keep the elbow slightly bent.',
      'Do not shrug the shoulder (keep traps relaxed).',
      'Movement should be smooth, not jerky.'
    ]
  },
  {
    id: 'squat-basic',
    name: 'Bodyweight Squat',
    description: 'Fundamental movement for lower body stability.',
    focusArea: 'Hips and Knees',
    keyInstructions: [
      'Feet shoulder-width apart.',
      'Keep chest up and look forward.',
      'Knees should track over toes, not cave inward.',
      'Depth: Thighs parallel to ground.',
      'Keep heels on the floor.'
    ]
  }
];
