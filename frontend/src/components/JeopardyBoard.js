import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './JeopardyBoard.css';
const JeopardyBoard = ({ round, onClueClick, answeredClues }) => {
    const values = [200, 400, 600, 800, 1000];
    // Group clues by category
    const cluesByCategory = round.categories.map(category => {
        const categoryClues = round.clues.filter(clue => clue.category_id === category.id);
        return {
            category,
            clues: categoryClues
        };
    });
    return (_jsxs("div", { className: "jeopardy-board", children: [_jsx("div", { className: "board-header", children: _jsx("h1", { children: "JEOPARDY!" }) }), _jsx("div", { className: "categories-row", children: round.categories.map((category, index) => (_jsx("div", { className: "category-header", children: category.name }, category.id))) }), _jsx("div", { className: "clues-grid", children: values.map((value, rowIndex) => (_jsx("div", { className: "clue-row", children: cluesByCategory.map((categoryData, colIndex) => {
                        const clue = categoryData.clues[rowIndex];
                        const isAnswered = clue ? answeredClues.has(clue.id) : false;
                        return (_jsx("div", { className: "clue-cell", children: clue ? (_jsx("button", { className: `clue-button ${isAnswered ? 'answered' : ''}`, onClick: () => !isAnswered && onClueClick(clue), disabled: isAnswered, children: isAnswered ? '✓' : `$${clue === null || clue === void 0 ? void 0 : clue.value}` })) : (_jsx("div", { className: "empty-clue", children: "$0" })) }, `${categoryData.category.id}-${clue === null || clue === void 0 ? void 0 : clue.value}`));
                    }) }, value))) })] }));
};
export default JeopardyBoard;
