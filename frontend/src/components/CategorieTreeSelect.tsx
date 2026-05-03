import React, { useState, useEffect } from 'react';
import { getCategoryTree, CategoriePatrimoineDto } from '../api/biens';
import './CategorieTreeSelect.css';

interface Props {
  value?: string;
  onChange: (code: string, node: CategoriePatrimoineDto) => void;
}

const CategorieTreeSelect: React.FC<Props> = ({ value, onChange }) => {
  const [tree, setTree] = useState<CategoriePatrimoineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCategoryTree();
        setTree(data);
      } catch (err) {
        console.error("Erreur lors du chargement du catalogue :", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleExpand = (code: string) => {
    setExpanded(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const renderNode = (node: CategoriePatrimoineDto) => {
    const isExpanded = expanded.includes(node.code);
    const hasChildren = node.enfants && node.enfants.length > 0;
    const isSelected = value === node.code;

    return (
      <div key={node.code} className="tree-node-wrapper">
        <div className={`node-row ${isSelected ? 'selected' : ''} level-${node.niveau}`}>
          {hasChildren ? (
            <button 
              type="button" 
              className="toggle-btn" 
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.code); }}
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : <span className="spacer" />}
          
          <div className="node-label" onClick={() => onChange(node.code, node)}>
            <span className="node-code-badge">{node.code}</span>
            <span className="node-text">{node.libelle}</span>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="node-children">
            {node.enfants.map(enfant => renderNode(enfant))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="skeleton-text">Chargement du catalogue...</div>;

  return (
    <div className="categorie-tree-select-container">
      {tree.map(root => renderNode(root))}
    </div>
  );
};

export default CategorieTreeSelect;
