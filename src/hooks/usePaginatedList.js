import { useState, useEffect, useImperativeHandle } from "react";
import { API_URL } from "../utils/api";

export function usePaginatedList({
  ref,
  fetchUrl,
  searchUrl,
  searchParam = "name",
  idField,
  onInit,
  onFetched,
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadDuration, setLoadDuration] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);

  const getToken = () => localStorage.getItem("token") || "";

  const fetchItems = async (nextPage = 1, { silent = false } = {}) => {
    if (loading) return;
    if (!silent) setLoading(true);
    const start = performance.now();
    const token = getToken();

    try {
      const res = await fetch(
        `${API_URL}${fetchUrl}?page=${nextPage}&limit=10`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error cargando datos");
      const data = await res.json();

      setHasMore(data.length >= 10);
      if (onFetched) await onFetched(data);
      setItems((prev) =>
        nextPage === 1
          ? data
          : [...prev, ...data.filter((d) => !prev.some((p) => p[idField] === d[idField]))]
      );
      setPage(nextPage);
    } catch (err) {
      console.error("Error al obtener datos:", err);
    } finally {
      setLoadDuration(performance.now() - start);
      if (!silent) setLoading(false);
    }
  };

  const refresh = () => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchItems(1);
  };

  useImperativeHandle(ref, () => ({ refresh }));

  useEffect(() => {
    if (onInit) {
      onInit().then((cached) => {
        if (cached?.length) setItems(cached);
        fetchItems(1, { silent: cached?.length > 0 });
      });
    } else {
      fetchItems(1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setFilteredItems([]);
        setHasMore(true);
        return;
      }
      const token = getToken();
      try {
        const res = await fetch(
          `${API_URL}${searchUrl}?${searchParam}=${encodeURIComponent(searchTerm)}`,
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setFilteredItems(Array.isArray(data) ? data : []);
        setHasMore(false);
      } catch {
        setFilteredItems([]);
        setHasMore(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toRender =
    searchTerm.trim() && filteredItems.length
      ? filteredItems
      : searchTerm.trim()
      ? []
      : items;

  return { toRender, items, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems, refresh };
}
