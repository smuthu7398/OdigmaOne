// XHR-based upload (fetch cannot report upload progress).

export function uploadWithProgress(
  file: File,
  opts: { taskId?: string } = {},
  onProgress?: (percent: number) => void
): Promise<{ id: string; originalName: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/files");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (body.success) resolve(body.data);
        else reject(new Error(body.error?.message ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    const formData = new FormData();
    formData.append("file", file);
    if (opts.taskId) formData.append("taskId", opts.taskId);
    xhr.send(formData);
  });
}
