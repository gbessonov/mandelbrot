import {useEffect, useState} from "react";

interface EditableProps {
    className: string;
    label: string;
    value: string | number;
    updateValue: (newValue: number) => void;
}

const Editable = (props: EditableProps) => {
    const {label, value, updateValue, className} = props;

    const [internalValue, setInternalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    // Sync internal value with prop if not editing
    useEffect(() => {
        if (!isEditing) {
            setInternalValue(value);
        }
    }, [value, isEditing]);

    const commitChange = () => {
        if (internalValue !== value) {
            let newValue : number = 0;

            if (typeof internalValue === "string") {
                newValue = parseFloat(internalValue);
            }

            if (typeof internalValue === "number") {
                newValue = internalValue;
            }

            updateValue(newValue);
        }
        setIsEditing(false);
    };

    const effectiveClassName = `${className} editable`;
    return (
        <div className={effectiveClassName}>
            <div className={'editable-label'}>
                <strong>{label}:</strong>
            </div>
            <input className={'editable-value'}
                   type="text"
                   value={internalValue}
                   onChange={(e) => {
                       setInternalValue(e.target.value);
                       setIsEditing(true);
                   }}
                   onBlur={commitChange}
                   onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                           e.currentTarget.blur(); // triggers onBlur -> commitChange
                       }
                   }}/>
        </div>
    );
}

export default Editable;
