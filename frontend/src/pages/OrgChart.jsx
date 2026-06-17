import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as ep from '../api/endpoints';

function Node({ node }) {
  return (
    <li>
      <Link to={`/employees/${node._id}`} className="node" style={{ color: 'inherit' }}>
        <span className="avatar">{node.photo?.url ? <img src={node.photo.url} alt="" /> : `${node.firstName[0]}${node.lastName?.[0] || ''}`}</span>
        <span>
          <b>{node.firstName} {node.lastName}</b>
          <span className="muted" style={{ display: 'block', fontSize: 12 }}>{node.designation?.title || '—'} · <span className="mono">{node.employeeId}</span></span>
        </span>
      </Link>
      {node.children?.length > 0 && <ul>{node.children.map((c) => <Node key={c._id} node={c} />)}</ul>}
    </li>
  );
}

export default function OrgChart() {
  const [tree, setTree] = useState([]);
  useEffect(() => { ep.getOrgChart().then(({ data }) => setTree(data.data.tree)); }, []);

  return (
    <div className="stack">
      <h1>Org chart</h1>
      <div className="card tree">
        {tree.length === 0 ? <div className="empty">No employees yet.</div> : <ul>{tree.map((n) => <Node key={n._id} node={n} />)}</ul>}
      </div>
    </div>
  );
}
