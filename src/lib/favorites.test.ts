import { beforeEach, describe, expect, it } from "vitest";
import { getFavoriteEventIds, isEventFavorite, toggleEventFavorite } from "./favorites";

describe("قائمة المفضلة", () => {
  beforeEach(() => localStorage.clear());

  it("تبدأ فارغة", () => {
    expect(getFavoriteEventIds("u1")).toEqual([]);
    expect(isEventFavorite("e1", "u1")).toBe(false);
  });

  it("الإضافة ثم الإزالة بالتبديل", () => {
    expect(toggleEventFavorite("e1", "u1")).toBe(true);
    expect(isEventFavorite("e1", "u1")).toBe(true);
    expect(toggleEventFavorite("e1", "u1")).toBe(false);
    expect(isEventFavorite("e1", "u1")).toBe(false);
  });

  it("مفصولة لكل مستخدم", () => {
    toggleEventFavorite("e1", "u1");
    expect(isEventFavorite("e1", "u2")).toBe(false);
    expect(isEventFavorite("e1")).toBe(false); // زائر
  });

  it("تتحمل بيانات تالفة في التخزين", () => {
    localStorage.setItem("nakfik:favorites:u1", "{not json");
    expect(getFavoriteEventIds("u1")).toEqual([]);
    localStorage.setItem("nakfik:favorites:u1", '"ليست مصفوفة"');
    expect(getFavoriteEventIds("u1")).toEqual([]);
  });
});
