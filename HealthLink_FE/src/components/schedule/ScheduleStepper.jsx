const ScheduleStepper = ({ steps, currentStep }) => {
    const totalSteps = steps.length;
    const current = steps[currentStep - 1];
    const progress = totalSteps > 1
        ? ((currentStep - 1) / (totalSteps - 1)) * 100
        : 100;

    return (
        <div className="schedule-stepper-compact">
            <div className="schedule-stepper-compact-head">
                <div className="schedule-stepper-current">
                    <span>{currentStep}</span>
                    <div>
                        <strong>{current?.label}</strong>
                        <small>Step {currentStep} of {totalSteps}</small>
                    </div>
                </div>

                <div className="schedule-stepper-percent">
                    {Math.round(progress)}%
                </div>
            </div>

            <div className="schedule-stepper-track">
                <div
                    className="schedule-stepper-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="schedule-stepper-mini">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;

                    return (
                        <div
                            key={step.key}
                            className={[
                                'schedule-stepper-dot',
                                isActive ? 'active' : '',
                                isCompleted ? 'completed' : '',
                            ].join(' ')}
                            title={step.label}
                        >
                            {isCompleted ? '✓' : stepNumber}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScheduleStepper;