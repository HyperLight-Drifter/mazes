export function attachItemDragHandlers(actor, html) {
  html.querySelectorAll(".item-entry[data-item-id]").forEach(el => {
    el.setAttribute("draggable", "true");
    el.addEventListener("dragstart", (event) => {
      if (event.target.closest("button, input, select, textarea")) {
        event.preventDefault();
        return;
      }
      const item = actor.items.get(el.dataset.itemId);
      if (!item) return;
      event.dataTransfer.setData("text/plain", JSON.stringify({
        type: "Item",
        uuid: item.uuid,
      }));
    });
  });
}
