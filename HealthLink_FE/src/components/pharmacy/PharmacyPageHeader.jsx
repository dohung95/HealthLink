export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="pharmacy-page-header">
      <div>
        {eyebrow && <span className="pharmacy-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
