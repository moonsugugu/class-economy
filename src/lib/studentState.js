// 학생 문서는 기존 classes/{classId}/students/{studentId} 경로를 유지한다.
// 보관은 문서를 삭제하지 않고 archivedAt 필드만 추가하는 방식이다.
export const isActiveStudent = (student) => !student?.archivedAt;
