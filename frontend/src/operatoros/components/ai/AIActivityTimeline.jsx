export default function AIActivityTimeline({ items = [] }) {
  return <section className='op-ai-activity-timeline'><h3>AI Activity</h3>{items.map((x,i)=><article key={x.id||i}><strong>{x.event||x.type}</strong><small>{x.actor||x.asked_by} · {x.created_at||x.updated_at}</small><p>{x.action_type||x.title} · {x.target_collection}:{x.target_id}</p></article>)}</section>
}
