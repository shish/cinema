use axum::http::StatusCode;
use axum::{response::IntoResponse, response::Response};

#[derive(Debug, Clone)]
pub struct CustomError(pub StatusCode, pub String);

impl IntoResponse for CustomError {
    fn into_response(self) -> Response {
        (self.0, self.1).into_response()
    }
}

impl From<anyhow::Error> for CustomError {
    fn from(err: anyhow::Error) -> Self {
        CustomError(StatusCode::INTERNAL_SERVER_ERROR, format!("{:?}", err))
    }
}
impl From<std::time::SystemTimeError> for CustomError {
    fn from(err: std::time::SystemTimeError) -> Self {
        CustomError(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("System time error: {:?}", err),
        )
    }
}
impl From<globwalk::GlobError> for CustomError {
    fn from(err: globwalk::GlobError) -> Self {
        CustomError(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("File system error: {:?}", err),
        )
    }
}
impl From<std::io::Error> for CustomError {
    fn from(err: std::io::Error) -> Self {
        CustomError(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("IO error: {:?}", err),
        )
    }
}
